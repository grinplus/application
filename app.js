/* =========================================================
   화면 그리기 스크립트 — 내용은 config.js 에서 읽어옵니다.
   (보통은 이 파일을 고칠 필요가 없습니다)
   ========================================================= */
(function () {
  /* 관리자가 화면에서 고친 설정(이 브라우저에 저장됨)이 있으면 그것을 사용
     문제가 생기면 주소 뒤에 ?reset-config 를 붙여 열면 원래 config.js 로 돌아갑니다. */
  let staleOverride = false;
  try {
    window.SITE_CONFIG_ORIGINAL = JSON.parse(JSON.stringify(window.SITE_CONFIG));
    if (/[?&]reset-config/.test(location.search)) {
      localStorage.removeItem("rw_config_override");
      localStorage.removeItem("rw_config_base");
    }
    const saved = localStorage.getItem("rw_config_override");
    if (saved) {
      window.SITE_CONFIG = JSON.parse(saved);
      window.SITE_CONFIG_OVERRIDDEN = true;
      // 수정본을 저장한 뒤 config.js 파일이 바뀌었으면 알려 줌
      staleOverride = localStorage.getItem("rw_config_base") !== JSON.stringify(window.SITE_CONFIG_ORIGINAL);
      // 운영 모드: 관리자 비밀번호·데이터 저장 주소는 항상 서버가 보낸 값 사용 (예전 수정본에 남은 비밀번호 무시)
      const O = window.SITE_CONFIG_ORIGINAL;
      if (O.backend && O.backend.url) { window.SITE_CONFIG.admin = O.admin; window.SITE_CONFIG.backend = O.backend; }
    }
  } catch (e) { /* 저장소를 쓸 수 없으면 config.js 그대로 */ }

  if (staleOverride) {
    (() => {
      const bar = document.createElement("div");
      bar.className = "stale-bar";
      bar.setAttribute("role", "alert");
      bar.innerHTML = `
        <span>⚠ <b>config.js 파일이 바뀌었습니다.</b> 지금은 이 브라우저에 저장된 <b>예전 수정본</b>이 보이고 있어 새 내용이 나타나지 않습니다.</span>
        <span class="stale-actions">
          <button type="button" class="btn small" data-stale="use-file">새 config.js 내용으로 보기</button>
          <button type="button" class="btn ghost small" data-stale="keep">수정본 계속 쓰기</button>
        </span>`;
      document.body.appendChild(bar);
      bar.addEventListener("click", (e) => {
        const b = e.target.closest("[data-stale]");
        if (!b) return;
        try {
          if (b.dataset.stale === "use-file") {
            localStorage.removeItem("rw_config_override");
            localStorage.removeItem("rw_config_base");
            location.reload();
          } else {
            localStorage.setItem("rw_config_base", JSON.stringify(window.SITE_CONFIG_ORIGINAL));
            bar.remove();
          }
        } catch (er) { bar.remove(); }
      });
    })();
  }

  /* 주차별 강의
     운영 모드: 서버가 보내는 config.js 에는 학습 내용이 빠져 있음(locked).
               승인된 수강생·관리자가 로그인하면 features.js 가 전체 내용을 받아 이 탭(sessionStorage)에 두고 새로고침
     체험 모드: 관리자가 이 브라우저에서 고친 값 */
  try {
    const C0 = window.SITE_CONFIG;
    const live = !!(C0 && C0.backend && C0.backend.url);
    const saved = JSON.parse((live ? sessionStorage.getItem("rw_full_weeks") : localStorage.getItem("rw_curriculum")) || "null");
    if (C0 && C0.curriculum && Array.isArray(saved)) C0.curriculum.weeks = saved;
  } catch (e) { /* 저장된 값이 없거나 읽을 수 없으면 config.js 그대로 */ }

  const C = window.SITE_CONFIG;
  if (!C) {
    document.body.innerHTML = "<p style='padding:24px'>Could not load config.js. Please check the file location and syntax.</p>";
    return;
  }

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 날짜 도우미 ---------- */
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n) => String(n).padStart(2, "0");
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDate = (s) => {            // "2026-09-01" 또는 "2026-09-07 23:59"
    const [d, t] = String(s).trim().split(/[ T]/);
    const [y, m, day] = d.split("-").map(Number);
    const [hh, mm] = (t || "0:0").split(":").map(Number);
    return new Date(y, m - 1, day, hh || 0, mm || 0);
  };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const fmtDate = (d) => `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  const fmtDateTime = (d) => `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };

  /* ---------- 주차별 일정 자동 계산 (시작일부터 매주, 휴강일은 건너뜀) ---------- */
  const S = C.schedule || {};
  const holidays = new Map((S.holidays || []).map((h) => [keyOf(parseDate(h.date)), h.name]));
  const weeks = (() => {
    if (!C.curriculum) return [];
    let d = parseDate(S.startDate || keyOf(today()));
    return C.curriculum.weeks.map((w, i) => {
      if (w.date) d = parseDate(w.date);
      else while (holidays.has(keyOf(d))) d = addDays(d, 7);
      const item = Object.assign({}, w, {
        no: i + 1,
        date: d,
        time: w.time || S.time || "",
        place: w.place || S.place || "",
        link: w.onlineLink || S.onlineLink || "",
        due: w.assignment && w.assignment.due ? parseDate(w.assignment.due) : null
      });
      d = addDays(d, 7);
      return item;
    });
  })();
  // 온라인 수업 입장 버튼 (schedule.onlineLink 가 있을 때만)
  const joinLink = (w) => w.link
    ? ` <a class="join-link" href="${esc(w.link)}" target="_blank" rel="noopener">Join class →</a>` : "";

  // 다음(또는 오늘) 수업 주차
  const nextWeek = weeks.find((w) => w.date >= today()) || null;

  /* 마감까지 남은 시간 */
  const remain = (due) => {
    const ms = due - new Date();
    if (ms <= 0) return { text: "Closed", cls: "closed", dday: "Closed" };
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
    const cal = Math.round((new Date(due.getFullYear(), due.getMonth(), due.getDate()) - today()) / 864e5);
    const dday = cal === 0 ? "D-DAY" : `D-${cal}`;
    const text = d > 0 ? `${d}d ${h}h left` : `${h}h ${m}m left`;
    return { text, cls: cal <= 3 ? "urgent" : "open", dday };
  };
  // 과제 제출 버튼: 외부 주소가 있으면 새 창, 없으면 사이트의 '출석·과제' 제출 화면으로
  const submitButton = (w) => {
    const ext = w.assignment.submit || S.submitLink;
    if (ext) return `<a class="btn" href="${esc(ext)}" target="_blank" rel="noopener">Submit assignment</a>`;
    if (C.student) return `<a class="btn" href="#${esc(C.student.id)}" data-submit-week="${w.no}">Submit assignment</a>`;
    return `<a class="btn" href="mailto:${esc(C.instructor.email)}?subject=${encodeURIComponent(`[Week ${w.no} assignment] ${w.assignment.title}`)}">Submit assignment</a>`;
  };

  /* 참고 영상: YouTube 주소에서 영상 ID 찾기 (watch?v= · youtu.be · shorts · embed · live) */
  const ytId = (url) => {
    const m = String(url || "").match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : "";
  };
  /* 수업 자료: Google Drive · Docs · Slides · Sheets 주소를 미리보기(embed) 주소로 */
  const driveEmbed = (url) => {
    const u = String(url || "");
    let m = u.match(/docs\.google\.com\/(document|presentation|spreadsheets|forms)\/d\/([A-Za-z0-9_-]+)/);
    if (m) return m[1] === "forms" ? `https://docs.google.com/forms/d/${m[2]}/viewform?embedded=true` : `https://docs.google.com/${m[1]}/d/${m[2]}/preview`;
    m = u.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/) || u.match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([A-Za-z0-9_-]+)/);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
    m = u.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]+)/);
    if (m) return `https://drive.google.com/embeddedfolderview?id=${m[1]}#list`;
    return "";
  };
  const driveKind = (url) => {
    const u = String(url || "");
    if (/\/document\//.test(u)) return "Docs";
    if (/\/presentation\//.test(u)) return "Slides";
    if (/\/spreadsheets\//.test(u)) return "Sheets";
    if (/\/forms\//.test(u)) return "Forms";
    if (/\/folders\//.test(u)) return "Folder";
    if (/drive\.google\.com/.test(u)) return "Drive";
    return "Link";
  };

  // 다른 스크립트(features.js)에서 쓸 수 있도록 공유
  window.SITE = { C, esc, $, $$, keyOf, parseDate, addDays, fmtDate, fmtDateTime, today, weeks, nextWeek, remain, pad, reduceMotion, ytId, driveEmbed };

  /* ---------- 기본 정보 / 히어로 ---------- */
  const H = C.hero;
  document.title = C.site.title;
  $("#brand").innerHTML = `<span>${esc(C.site.title)}</span>${C.site.version ? `<small class="brand-ver">${esc(C.site.version)}</small>` : ""}`;
  if (H.image) {
    const img = $("#heroImage");
    img.src = H.image;
    img.alt = H.imageAlt || "";
    img.addEventListener("error", () => { $("#heroFigure").hidden = true; $("#heroContent").classList.remove("with-image"); });
    $("#heroFigure").hidden = false;
    $("#heroContent").classList.add("with-image");
  }
  $("#heroBadge").textContent = H.badge;
  $("#heroTitle").textContent = H.title;
  $("#heroSubtitle").textContent = H.subtitle;
  $("#heroText").textContent = H.text;
  $("#footerText").textContent = C.site.footer;

  const apply = $("#applyBtn");
  apply.textContent = H.applyButton.label;
  if (H.applyButton.link) {
    apply.href = H.applyButton.link;
    apply.target = "_blank";
    apply.rel = "noopener";
  } else {
    apply.href = C.apply ? "#" + C.apply.id
      : `mailto:${C.instructor.email}?subject=${encodeURIComponent("[Enrollment] " + H.title)}`;
  }
  $("#curriculumBtn").textContent = H.curriculumButton.label;
  $("#curriculumBtn").href = "#" + H.curriculumButton.target;

  /* ---------- 메뉴 ---------- */
  const nav = $("#nav");
  nav.innerHTML = C.menu.map((m) => `<a href="#${esc(m.id)}" data-id="${esc(m.id)}">${esc(m.label)}</a>`).join("");

  const toggle = $("#menuToggle");
  const setMenu = (open) => {
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  toggle.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".header")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ---------- 섹션 그리기 ---------- */
  const head = (s, eyebrow) => `
    <div class="section-head">
      <div class="eyebrow">${esc(eyebrow)}</div>
      <h2>${esc(s.title)}</h2>
      ${s.lead ? `<p>${esc(s.lead)}</p>` : ""}
    </div>`;

  const iconCard = (c) => `
    <article class="card reveal">
      <div class="icon">${esc(c.icon)}</div>
      <h3>${esc(c.title)}</h3>
      <p>${esc(c.text)}</p>
    </article>`;

  const render = {
    info: (s) => `
      <section class="info-wrap" id="${esc(s.id)}">
        <div class="info-bar">
          ${s.items.map((it) => `
            <div class="info-item">
              <div class="info-icon">${esc(it.icon)}</div>
              <div>
                <div class="info-label">${esc(it.label)}</div>
                <div class="info-value">${esc(it.value)}</div>
                ${it.sub ? `<div class="info-sub">${esc(it.sub)}</div>` : ""}
              </div>
            </div>`).join("")}
        </div>
      </section>`,

    stats: (s) => `
      <section class="section" id="${esc(s.id)}">
        ${head(s, "In Numbers")}
        <div class="stats">
          ${s.items.map((it) => `
            <div class="card stat reveal">
              <div class="stat-num"><span class="count" data-to="${Number(it.value) || 0}">${reduceMotion ? esc(it.value) : 0}</span><small>${esc(it.suffix)}</small></div>
              <div class="stat-label">${esc(it.label)}</div>
            </div>`).join("")}
        </div>
      </section>`,

    strengths: (s) => `
      <section class="section" id="${esc(s.id)}">
        ${head(s, "Why this class")}
        <div class="slider reveal">
          <div class="slides" tabindex="0" aria-label="${esc(s.title)} slides">
            ${s.items.map((c, i) => `
              <article class="card slide" aria-label="${i + 1} / ${s.items.length}">
                <div class="slide-num">${String(i + 1).padStart(2, "0")}</div>
                <div class="icon">${esc(c.icon)}</div>
                <h3>${esc(c.title)}</h3>
                <p>${esc(c.text)}</p>
              </article>`).join("")}
          </div>
          <div class="slider-ctrl">
            <button class="slider-btn prev" type="button" aria-label="Previous">‹</button>
            <div class="dots">${s.items.map((_, i) => `<button type="button" class="dot" aria-label="Slide ${i + 1}"></button>`).join("")}</div>
            <button class="slider-btn next" type="button" aria-label="Next">›</button>
          </div>
        </div>
      </section>`,

    curriculum: (s) => `
      <section class="section" id="${esc(s.id)}">
        ${head(s, "Curriculum")}
        <div class="week-tools">
          <span class="legend"><i class="lg done"></i>Past <i class="lg now"></i>Next class <i class="lg hw"></i>Assignment</span>
          <span class="week-tool-btns">
            <button class="btn small admin-only" type="button" data-week-add hidden>+ 주차 추가</button>
            <button class="btn ghost small admin-only" type="button" data-week-reset hidden>원래대로</button>
            <button class="btn ghost small" type="button" id="toggleAllWeeks">Expand all</button>
          </span>
        </div>
        <div class="week-list">
          ${weeks.map((w) => {
            const state = w === nextWeek ? "now" : w.date < today() ? "done" : "";
            const r = w.due ? remain(w.due) : null;
            return `
            <details class="card week-item ${state}" id="week-${w.no}" ${w === nextWeek ? "open" : ""}>
              <summary>
                <span class="week-no">${w.no}<small>wk</small></span>
                <span class="week-head">
                  <span class="week-date">${esc(fmtDate(w.date))}${state === "now" ? ` <b class="chip now">Next class</b>` : ""}</span>
                  <strong>${esc(w.title)}</strong>
                  ${w.summary ? `<span class="week-sum">${esc(w.summary)}</span>` : ""}
                </span>
                ${r ? `<span class="chip hw ${r.cls}" data-due-chip="${w.no}">Due ${esc(r.dday)}</span>` : ""}
                <button type="button" class="btn ghost small admin-only week-edit-btn" data-week-edit="${w.no - 1}" hidden>편집</button>
                <span class="chev" aria-hidden="true"></span>
              </summary>
              <div class="week-body">
                <div class="week-admin admin-only" hidden>
                  <span>관리자</span>
                  <button class="btn ghost small" type="button" data-week-edit="${w.no - 1}">이 주차 수정</button>
                  <button class="btn ghost small" type="button" data-week-del="${w.no - 1}">삭제</button>
                </div>
                <dl class="week-meta">
                  <div><dt>Date</dt><dd>${esc(fmtDate(w.date))}</dd></div>
                  <div><dt>Time</dt><dd>${esc(w.time)}</dd></div>
                  <div><dt>Format</dt><dd>${esc(w.place)}${w.locked ? "" : joinLink(w)}</dd></div>
                </dl>
                ${w.locked ? `
                <div class="week-locked">
                  <p><b>This week's lesson materials are for approved students.</b><br>Log in with your approved student account to see the topics, videos, materials, and assignment details.</p>
                  <a class="btn small" href="#${esc((C.student && C.student.id) || "student")}">Log in</a>
                </div>` : `
                <div class="week-cols">
                  <div>
                    <h4>Topics</h4>
                    ${w.contents && w.contents.length
                      ? `<ul class="contents">${w.contents.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>`
                      : `<p class="muted">Coming soon.</p>`}
                  </div>
                  <div>
                    <h4>Videos</h4>
                    ${w.videos && w.videos.length
                      ? `<div class="videos">${w.videos.map((v) => {
                          const id = ytId(v.url);
                          // YouTube 주소: 썸네일을 누르면 그 자리에서 재생 / 그 밖의 주소: 새 창 링크
                          return id ? `
                            <figure class="yt" data-yt="${id}" data-yt-title="${esc(v.title || "YouTube video")}">
                              <button type="button" class="yt-play" aria-label="Play ${esc(v.title || "video")}">
                                <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy">
                                <span class="yt-btn" aria-hidden="true"></span>
                              </button>
                              ${v.title ? `<figcaption>${esc(v.title)}</figcaption>` : ""}
                            </figure>`
                            : `<a class="video-link" href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.title || v.url)} ↗</a>`;
                        }).join("")}</div>`
                      : `<p class="muted">No videos this week.</p>`}
                  </div>
                </div>
                ${w.materials && w.materials.length ? `
                <div class="materials">
                  <h4>Materials</h4>
                  <ul class="mat-list">${w.materials.map((m, mi) => {
                    const embed = driveEmbed(m.url);
                    return `
                    <li>
                      <div class="mat-row">
                        <span class="mat-kind">${esc(driveKind(m.url))}</span>
                        <a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.title || m.url)}</a>
                        ${embed ? `<button type="button" class="link-btn mat-toggle" data-mat-embed="${esc(embed)}" aria-expanded="false" aria-controls="mat-${w.no}-${mi}">Preview</button>` : ""}
                      </div>
                      ${embed ? `<div class="mat-preview" id="mat-${w.no}-${mi}" hidden></div>` : ""}
                    </li>`;
                  }).join("")}</ul>
                </div>` : ""}
                ${w.assignment && r ? `
                <div class="assignment ${r.cls}">
                  <div class="as-head">
                    <span class="as-label">Assignment</span>
                    <strong>${esc(w.assignment.title)}</strong>
                  </div>
                  <p>${esc(w.assignment.desc)}</p>
                  <div class="as-foot">
                    <div>
                      <div class="as-due">Due · ${esc(fmtDateTime(w.due))}</div>
                      <div class="countdown" data-due="${w.no}">${esc(r.dday)} · ${esc(r.text)}</div>
                    </div>
                    ${r.cls === "closed" && !(C.student && C.student.allowLate)
                      ? `<span class="btn disabled" aria-disabled="true">Closed</span>`
                      : submitButton(w)}
                  </div>
                </div>` : ""}`}
              </div>
            </details>`;
          }).join("")}
        </div>
      </section>`,

    calendar: (s) => `
      <section class="section" id="${esc(s.id)}">
        ${head(s, "Calendar")}
        <div class="cal-layout">
          <div class="card cal">
            <div class="cal-top">
              <button class="slider-btn" type="button" id="calPrev" aria-label="Previous month">‹</button>
              <h3 id="calTitle" aria-live="polite"></h3>
              <button class="slider-btn" type="button" id="calNext" aria-label="Next month">›</button>
            </div>
            <div class="cal-grid cal-dow">${DAYS.map((d) => `<span>${d}</span>`).join("")}</div>
            <div class="cal-grid" id="calDays"></div>
            <div class="cal-foot">
              <span class="legend"><i class="lg now"></i>Class <i class="lg hw"></i>Due <i class="lg off"></i>No class <i class="lg ev"></i>Event</span>
              <span class="cal-btns">
                <button class="btn small" type="button" id="calAdd" hidden>+ 일정 추가</button>
                <button class="btn ghost small" type="button" id="calToday">Today</button>
              </span>
            </div>
          </div>
          <aside class="card day-panel" id="dayPanel" aria-live="polite"></aside>
        </div>
      </section>`,

    tools: (s) => `
      <section class="section" id="${esc(s.id)}">
        ${head(s, "AI Tools")}
        <div class="grid">
          ${s.items.map((t) => `
            <article class="card tool reveal">
              <div class="tool-top">
                <span class="icon">${esc(t.icon)}</span>
                <div>
                  <h3>${esc(t.name)}</h3>
                  <span class="tag sub">${esc(t.use)}</span>
                </div>
              </div>
              <p>${esc(t.text)}</p>
              ${t.link ? `<a class="link" href="${esc(t.link)}" target="_blank" rel="noopener">Visit site →</a>` : ""}
            </article>`).join("")}
        </div>
      </section>`,

    prepare: (s) => `
      <section class="section" id="${esc(s.id)}">
        ${head(s, "Checklist")}
        <div class="grid prepare">
          ${s.items.map((c) => `
            <label class="card check-card reveal">
              <input type="checkbox">
              <span class="icon">${esc(c.icon)}</span>
              <span>
                <strong>${esc(c.title)}</strong>
                <span class="muted">${esc(c.text)}</span>
              </span>
            </label>`).join("")}
        </div>
      </section>`,

    readings: (s) => `
      <section class="section" id="${esc(s.id)}">
        ${head(s, "Reading")}
        <div class="reading-list">
          ${s.items.map((r, i) => `
            <article class="card reading reveal">
              <div class="num">${String(i + 1).padStart(2, "0")}</div>
              <div class="body">
                <div class="meta">
                  <span class="tag ${/^(필수|required)$/i.test(r.tag) ? "" : "sub"}">${esc(r.tag)}</span>
                  <span>${esc(r.author)}</span>
                </div>
                <h3>${esc(r.title)}</h3>
                <p>${esc(r.summary)}</p>
                ${r.link
                  ? `<a class="link" href="${esc(r.link)}" target="_blank" rel="noopener">Open →</a>`
                  : `<span class="link disabled">Link coming soon</span>`}
              </div>
            </article>`).join("")}
        </div>
      </section>`,

    quiz: (s) => `
      <section class="section" id="${esc(s.id)}">
        ${head(s, "Practice")}
        <div class="quiz-list">
          ${s.questions.map((q, i) => `
            <article class="card question reveal" data-index="${i}">
              <div class="q-num">Q${i + 1}</div>
              <div class="q-title">${esc(q.question)}</div>
              ${q.type === "short"
                ? `<input class="short-input" type="text" placeholder="Type your answer" aria-label="Q${i + 1} answer">`
                : `<div class="options">
                    ${q.options.map((o, j) => `
                      <label class="option">
                        <input type="radio" name="q${i}" value="${j}">
                        <span>${esc(o)}</span>
                      </label>`).join("")}
                   </div>`}
              <div class="q-actions">
                <button class="btn check" type="button">Check answer</button>
                <button class="btn ghost reset" type="button">Try again</button>
              </div>
              <div class="feedback" role="status"></div>
            </article>`).join("")}
        </div>
        <div class="card score">
          <span>Correct <strong id="scoreText">0 / ${s.questions.length}</strong></span>
          <button class="btn ghost" id="resetAll" type="button">Reset all</button>
        </div>
      </section>`,

    faq: (s) => `
      <section class="section" id="${esc(s.id)}">
        ${head(s, "FAQ")}
        <div class="faq-list">
          ${s.items.map((f) => `
            <details class="card faq reveal">
              <summary><span class="q-mark">Q</span>${esc(f.q)}</summary>
              <p>${esc(f.a)}</p>
            </details>`).join("")}
        </div>
      </section>`,

    infographic: (s) => {
      const tone = (i) => `ig-t${(i % 4) + 1}`;                 // 단계별 색: 얕은 바다 → 깊은 바다
      const total = weeks.length || 15;
      const phaseOf = (n) => (s.phases || []).findIndex((p) => n >= p.from && n <= p.to);
      const sumMin = (s.session || []).reduce((a, b) => a + (Number(b.minutes) || 0), 0) || 1;
      let acc = 0;
      const stops = (s.assessment || []).map((a, i) => {
        const start = acc; acc += Number(a.percent) || 0;
        return `var(--ig${(i % 4) + 1}) ${start}% ${acc}%`;
      }).join(", ");
      return `
      <section class="section infographic" id="${esc(s.id)}">
        ${head(s, "At a Glance")}
        <div class="ig-board card reveal">
          ${s.facts && s.facts.length ? `
          <div class="ig-facts">
            ${s.facts.map((f) => `<div class="ig-fact"><span class="ig-ico">${esc(f.icon)}</span><b>${esc(f.value)}</b><span>${esc(f.label)}</span></div>`).join("")}
          </div>` : ""}

          ${s.phases && s.phases.length ? `
          <h3 class="ig-h">The 15-Week Journey</h3>
          <div class="ig-strip" role="img" aria-label="${esc(s.phases.map((p) => `Weeks ${p.from}–${p.to} ${p.title}`).join(", "))}">
            ${Array.from({ length: total }, (_, i) => {
              const n = i + 1, p = phaseOf(n), now = nextWeek && nextWeek.no === n;
              return `<span class="ig-cell ${p > -1 ? tone(p) : ""} ${now ? "now" : ""}" title="Week ${n}${now ? " · next class" : ""}">${n}${now ? `<i>NOW</i>` : ""}</span>`;
            }).join("")}
          </div>
          <ol class="ig-phases">
            ${s.phases.map((p, i) => `
              <li class="ig-phase">
                <div class="ig-band ${tone(i)}"><span>${esc(p.icon)}</span> STEP ${i + 1} · WEEKS ${esc(p.from)}–${esc(p.to)}</div>
                <h4>${esc(p.title)}</h4>
                <ul>${(p.items || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
              </li>`).join("")}
          </ol>` : ""}

          <div class="ig-split">
            ${s.session && s.session.length ? `
            <div class="ig-box">
              <h3 class="ig-h">${esc(s.sessionTitle || "Class structure")}</h3>
              <div class="ig-bar" role="img" aria-label="${esc(s.session.map((x) => `${x.label} ${x.minutes} min`).join(", "))}">
                ${s.session.map((x, i) => `<span class="ig-seg ${tone(i)}" style="flex:${Number(x.minutes) || 0}">${esc(x.minutes)} min</span>`).join("")}
              </div>
              <ul class="ig-legend">
                ${s.session.map((x, i) => `<li><i class="${tone(i)}"></i>${esc(x.label)} <b>${esc(x.minutes)} min</b> <small>${Math.round(((Number(x.minutes) || 0) / sumMin) * 100)}%</small></li>`).join("")}
              </ul>
            </div>` : ""}
            ${s.assessment && s.assessment.length ? `
            <div class="ig-box ig-assess">
              <h3 class="ig-h">${esc(s.assessmentTitle || "Grading")}</h3>
              <div class="ig-donut-wrap">
                <div class="ig-donut" style="background:conic-gradient(${stops})" role="img" aria-label="${esc(s.assessment.map((a) => `${a.label} ${a.percent}%`).join(", "))}">
                  <span><b>100%</b>total</span>
                </div>
                <ul class="ig-legend">
                  ${s.assessment.map((a, i) => `<li><i class="${tone(i)}"></i>${esc(a.label)} <b>${esc(a.percent)}%</b></li>`).join("")}
                </ul>
              </div>
            </div>` : ""}
          </div>

          ${s.outcomes && s.outcomes.length ? `
          <div class="ig-outcomes">
            <h3 class="ig-h">${esc(s.outcomesTitle || "Outcomes")}</h3>
            <ol>${s.outcomes.map((o) => `<li>${esc(o)}</li>`).join("")}</ol>
          </div>` : ""}
        </div>
      </section>`;
    },

    instructor: (s) => `
      <div class="footer-head">
        <div class="eyebrow">Instructor</div>
        <h2>${esc(s.title)}</h2>
        ${s.lead ? `<p>${esc(s.lead)}</p>` : ""}
      </div>
      <article class="instructor">
          <div class="photo">
            ${s.photo ? `<img src="${esc(s.photo)}" alt="Photo of ${esc(s.name)}">` : ""}
            <span class="photo-fallback">${esc((s.name || "?").charAt(0))}</span>
          </div>
          <div class="instructor-body">
            <h3>${esc(s.name)}</h3>
            ${s.role ? `<div class="role">${esc(s.role)}</div>` : ""}
            ${s.bio ? `${s.bioLabel ? `<h4 class="profile-label">${esc(s.bioLabel)}</h4>` : ""}<p>${esc(s.bio)}</p>` : ""}
            ${s.career && s.career.length ? `${s.careerLabel ? `<h4 class="profile-label">${esc(s.careerLabel)}</h4>` : ""}<ul>${s.career.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
            <div class="contact">
              <a class="btn" href="mailto:${esc(s.email)}">${esc(s.email)}</a>
              ${s.office ? `<span class="office">${esc(s.office)}</span>` : ""}
            </div>
          </div>
      </article>`
  };

  // render 에 없는 섹션(투표·신청서·출석 등)은 자리만 만들고 features.js 가 채웁니다
  const holder = (key, s) => `
    <section class="section" id="${esc(s.id || key)}" data-feature="${esc(key)}">
      ${head(s, { vote: "Live Poll", apply: "Application", student: "Student", notices: "Notice" }[key] || "")}
      <div class="feature-body"></div>
    </section>`;
  $("#main").innerHTML = (C.order || [])
    .filter((key) => key !== "instructor" && C[key] && typeof C[key] === "object" && !Array.isArray(C[key]))
    .map((key) => (render[key] ? render[key](C[key]) : holder(key, C[key])))
    .join("");
  if (C.instructor) $("#footerInstructor").innerHTML = render.instructor(C.instructor);

  /* ---------- 교수자 사진: 없으면 이니셜 표시 ---------- */
  const photo = $(".photo img");
  if (photo) {
    const ok = () => photo.parentElement.classList.add("has-img");
    photo.addEventListener("error", () => photo.remove());
    photo.complete && photo.naturalWidth ? ok() : photo.addEventListener("load", ok);
  }

  /* ---------- 슬라이드 ---------- */
  $$(".slider").forEach((slider) => {
    const track = $(".slides", slider);
    const slides = $$(".slide", slider);
    const dots = $$(".dot", slider);
    const step = () => slides[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
    const current = () => Math.round(track.scrollLeft / step());
    const go = (i) => track.scrollTo({ left: i * step(), behavior: reduceMotion ? "auto" : "smooth" });
    const update = () => {
      const i = current();
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      const active = atEnd ? slides.length - 1 : i;
      dots.forEach((d, j) => d.classList.toggle("active", j === active));
      $(".prev", slider).disabled = track.scrollLeft <= 4;
      $(".next", slider).disabled = atEnd;
    };
    $(".prev", slider).addEventListener("click", () => go(current() - 1));
    $(".next", slider).addEventListener("click", () => go(current() + 1));
    dots.forEach((d, j) => d.addEventListener("click", () => go(j)));
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(current() + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(current() - 1); }
    });
    let t;
    track.addEventListener("scroll", () => { clearTimeout(t); t = setTimeout(update, 60); }, { passive: true });
    window.addEventListener("resize", update);
    update();
  });

  /* ---------- 주차별 강의: 모두 펼치기/접기 ---------- */
  const allBtn = $("#toggleAllWeeks");
  if (allBtn) {
    const items = $$(".week-item");
    const sync = () => { allBtn.textContent = items.every((d) => d.open) ? "Collapse all" : "Expand all"; };
    allBtn.addEventListener("click", () => {
      const open = !items.every((d) => d.open);
      items.forEach((d) => (d.open = open));
      sync();
    });
    items.forEach((d) => d.addEventListener("toggle", sync));
    sync();
  }

  /* 참고 영상: 썸네일을 누르면 그 자리에서 YouTube 재생 (처음부터 플레이어를 띄우지 않아 페이지가 가벼움) */
  document.addEventListener("click", (e) => {
    const play = e.target.closest(".yt-play");
    if (play) {
      const fig = play.closest(".yt");
      const frame = document.createElement("iframe");
      frame.src = `https://www.youtube-nocookie.com/embed/${fig.dataset.yt}?autoplay=1&rel=0`;
      frame.title = fig.dataset.ytTitle || "YouTube video";
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.allowFullscreen = true;
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      play.replaceWith(frame);
      frame.focus();
      return;
    }
    // 수업 자료: Google Drive 미리보기 펼치기 / 접기
    const mt = e.target.closest(".mat-toggle");
    if (mt) {
      const box = document.getElementById(mt.getAttribute("aria-controls"));
      const open = mt.getAttribute("aria-expanded") !== "true";
      if (open && !box.firstChild) {
        const f = document.createElement("iframe");
        f.src = mt.dataset.matEmbed;
        f.title = "Material preview";
        f.loading = "lazy";
        f.allow = "autoplay";
        box.appendChild(f);
      }
      box.hidden = !open;
      mt.setAttribute("aria-expanded", String(open));
      mt.textContent = open ? "Close preview" : "Preview";
    }
  });
  const openWeek = (no) => {
    const el = document.getElementById("week-" + no);
    if (!el) return;
    el.open = true;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  /* ---------- 마감 카운트다운 (30초마다 갱신) ---------- */
  const tickCountdowns = () => {
    weeks.filter((w) => w.due).forEach((w) => {
      const r = remain(w.due);
      $$(`[data-due="${w.no}"]`).forEach((el) => {
        el.textContent = `${r.dday} · ${r.text}`;
        const box = el.closest(".assignment, .dp-item");
        if (box) box.classList.remove("open", "urgent", "closed"), box.classList.add(r.cls);
      });
      $$(`[data-due-chip="${w.no}"]`).forEach((el) => {
        el.textContent = `Due ${r.dday}`;
        el.className = `chip hw ${r.cls}`;
      });
    });
  };
  if (weeks.some((w) => w.due)) setInterval(tickCountdowns, 30000);

  /* ---------- 월간 달력 ---------- */
  if ($("#calDays")) {
    // 날짜별 일정 모으기
    const events = {};
    const at = (d) => (events[keyOf(d)] = events[keyOf(d)] || { classes: [], dues: [], holiday: "", custom: [] });
    weeks.forEach((w) => {
      at(w.date).classes.push(w);
      if (w.due) at(w.due).dues.push(w);
    });
    holidays.forEach((name, k) => { at(parseDate(k)).holiday = name; });

    const first = weeks[0] ? weeks[0].date : today();
    const last = weeks.length ? weeks[weeks.length - 1].date : today();
    const t0 = today();
    // 학기 중이면 이번 달, 아니면 첫 수업 달부터
    let view = (t0 >= first && t0 <= addDays(last, 31)) ? new Date(t0.getFullYear(), t0.getMonth(), 1)
                                                        : new Date(first.getFullYear(), first.getMonth(), 1);
    let selected = keyOf(nextWeek ? nextWeek.date : first);

    const drawMonth = () => {
      const y = view.getFullYear(), m = view.getMonth();
      $("#calTitle").textContent = `${new Date(y, m, 1).toLocaleString("en-US", { month: "long" })} ${y}`;
      const start = new Date(y, m, 1 - new Date(y, m, 1).getDay());
      let html = "";
      for (let i = 0; i < 42; i++) {
        const d = addDays(start, i);
        if (i >= 35 && d.getMonth() !== m) break;           // 5주로 끝나는 달은 6번째 줄 생략
        const k = keyOf(d), ev = events[k];
        const cls = ["cal-day"];
        if (d.getMonth() !== m) cls.push("other");
        if (k === keyOf(t0)) cls.push("today");
        if (k === selected) cls.push("selected");
        if (d.getDay() === 0) cls.push("sun");
        if (ev && ev.classes.length) cls.push("has-class");
        if (ev && ev.holiday) cls.push("off");
        const marks = ev ? [
          ...ev.classes.map((w) => `<span class="mk class">Wk ${w.no}</span>`),
          ...ev.dues.map(() => `<span class="mk due">Due</span>`),
          ev.holiday ? `<span class="mk off">No class</span>` : "",
          ...ev.custom.map((c) => `<span class="mk ev" title="${esc(c.title)}">${esc(c.title)}</span>`)
        ].join("") : "";
        const label = `${MONTHS[d.getMonth()]} ${d.getDate()}` +
          (ev ? ev.classes.map((w) => `, Week ${w.no} class`).join("") + (ev.dues.length ? ", assignment due" : "") + (ev.holiday ? `, ${ev.holiday}` : "") + ev.custom.map((c) => `, ${c.title}`).join("") : "");
        html += `<button type="button" class="${cls.join(" ")}" data-key="${k}" aria-label="${esc(label)}" aria-pressed="${k === selected}">
                   <span class="dn">${d.getDate()}</span>${marks}
                 </button>`;
      }
      $("#calDays").innerHTML = html;
    };

    const drawPanel = () => {
      const d = parseDate(selected), ev = events[selected];
      let html = `<div class="dp-date">${esc(fmtDate(d))}</div>`;
      if (!ev || (!ev.classes.length && !ev.dues.length && !ev.holiday && !ev.custom.length)) {
        html += `<p class="muted dp-empty">No class on this day.</p>`;
        if (nextWeek) html += `<button class="btn ghost small" type="button" data-goto="${keyOf(nextWeek.date)}">See next class →</button>`;
      } else {
        if (ev.holiday) html += `<div class="dp-item off"><span class="chip off">No class</span> ${esc(ev.holiday)}</div>`;
        // 관리자가 추가한 일정 (수정·삭제 버튼은 관리자에게만)
        ev.custom.forEach((c) => {
          html += `
            <div class="dp-item ev">
              <span class="chip ev">Event${c.time ? " " + esc(c.time) : ""}</span>
              <h4>${esc(c.title)}</h4>
              ${c.body ? `<p class="dp-body">${esc(c.body).replace(/\n/g, "<br>")}</p>` : ""}
              ${window.SITE.adminToken ? `<div class="dp-admin">
                ${c.popup ? `<span class="chip hw open">팝업</span>` : ""}${c.notice ? `<span class="chip hw open">공지</span>` : ""}
                <button class="btn ghost small" type="button" data-ev-edit="${esc(c.id)}">수정</button>
                <button class="btn ghost small" type="button" data-ev-del="${esc(c.id)}">삭제</button>
              </div>` : ""}
            </div>`;
        });
        ev.classes.forEach((w) => {
          html += `
            <div class="dp-item">
              <span class="chip now">Week ${w.no} class</span>
              <h4>${esc(w.title)}</h4>
              <div class="dp-meta">${esc(w.time)}<br>${esc(w.place)}${joinLink(w)}</div>
              ${w.contents && w.contents.length ? `<ul class="contents">${w.contents.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}
              ${w.assignment ? `<div class="dp-hw">Assignment · ${esc(w.assignment.title)}</div>` : ""}
              <button class="btn small" type="button" data-week="${w.no}">View week →</button>
            </div>`;
        });
        ev.dues.forEach((w) => {
          const r = remain(w.due);
          html += `
            <div class="dp-item due ${r.cls}">
              <span class="chip hw ${r.cls}">Due ${esc(pad(w.due.getHours()))}:${esc(pad(w.due.getMinutes()))}</span>
              <h4>${esc(w.assignment.title)}</h4>
              <div class="countdown" data-due="${w.no}">${esc(r.dday)} · ${esc(r.text)}</div>
              <button class="btn ghost small" type="button" data-week="${w.no}">View Week ${w.no} assignment →</button>
            </div>`;
        });
      }
      $("#dayPanel").innerHTML = html;
    };

    const select = (k) => {
      selected = k;
      const d = parseDate(k);
      if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) view = new Date(d.getFullYear(), d.getMonth(), 1);
      drawMonth();
      drawPanel();
    };

    $("#calDays").addEventListener("click", (e) => {
      const b = e.target.closest(".cal-day");
      if (b) select(b.dataset.key);
    });
    $("#calDays").addEventListener("keydown", (e) => {
      const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (!step) return;
      e.preventDefault();
      select(keyOf(addDays(parseDate(selected), step)));
      const b = $(`.cal-day[data-key="${selected}"]`);
      if (b) b.focus();
    });
    $("#calPrev").addEventListener("click", () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); drawMonth(); });
    $("#calNext").addEventListener("click", () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); drawMonth(); });
    $("#calToday").addEventListener("click", () => select(keyOf(today())));
    $("#dayPanel").addEventListener("click", (e) => {
      const w = e.target.closest("[data-week]");
      if (w) openWeek(Number(w.dataset.week));
      const g = e.target.closest("[data-goto]");
      if (g) select(g.dataset.goto);
    });

    drawMonth();
    drawPanel();

    // 관리자 일정 추가 기능(features.js)에서 쓰기
    window.SITE.calendar = {
      selected: () => selected,
      select,
      redraw: () => { drawMonth(); drawPanel(); },
      setCustom: (list) => {
        Object.values(events).forEach((ev) => { ev.custom = []; });
        (list || []).slice().sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")))
          .forEach((c) => { if (c.date) at(parseDate(c.date)).custom.push(c); });
        drawMonth();
        drawPanel();
      }
    };
  }

  /* ---------- 문제풀이 동작 ---------- */
  if (C.quiz && $("#scoreText")) {
    const solved = new Set();
    const updateScore = () => { $("#scoreText").textContent = `${solved.size} / ${C.quiz.questions.length}`; };
    const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, " ");

    const resetCard = (card) => {
      $$("input[type=radio]", card).forEach((r) => (r.checked = false));
      $$(".option", card).forEach((el) => el.classList.remove("correct", "wrong"));
      const t = $(".short-input", card);
      if (t) t.value = "";
      $(".feedback", card).className = "feedback";
      solved.delete(Number(card.dataset.index));
      updateScore();
    };

    $$(".question").forEach((card) => {
      const i = Number(card.dataset.index);
      const q = C.quiz.questions[i];
      const fb = $(".feedback", card);
      const show = (ok, msg) => { fb.className = "feedback show " + (ok ? "ok" : "no"); fb.textContent = msg; };

      $(".check", card).addEventListener("click", () => {
        let ok;
        if (q.type === "short") {
          const v = $(".short-input", card).value;
          if (!v.trim()) return show(false, "Please type an answer.");
          ok = [].concat(q.answer).some((a) => norm(a) === norm(v));
        } else {
          const picked = $("input:checked", card);
          if (!picked) return show(false, "Please choose an option.");
          ok = Number(picked.value) === q.answer;
          $$(".option", card).forEach((el, j) => {
            el.classList.toggle("correct", j === q.answer);
            el.classList.toggle("wrong", !ok && j === Number(picked.value));
          });
        }
        ok ? solved.add(i) : solved.delete(i);
        updateScore();
        show(ok, (ok ? "Correct! " : "Not quite. ") + (q.explain || ""));
      });
      $(".reset", card).addEventListener("click", () => resetCard(card));
    });
    $("#resetAll").addEventListener("click", () => $$(".question").forEach(resetCard));
  }

  /* ---------- 숫자 올라가는 효과 ---------- */
  const countUp = (el) => {
    const to = Number(el.dataset.to);
    if (reduceMotion || !to) { el.textContent = to; return; }
    const start = performance.now(), dur = 1200;
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* 오래된 브라우저: 효과 없이 바로 보여주기 */
  if (!("IntersectionObserver" in window)) {
    $$(".reveal").forEach((el) => el.classList.add("in"));
    $$(".count").forEach((el) => (el.textContent = el.dataset.to));
    return;
  }

  /* ---------- 헤더 그림자 & 현재 위치 메뉴 강조 ---------- */
  const header = $(".header");
  const links = $$("a", nav);
  const setActive = (id) => links.forEach((a) => a.classList.toggle("active", a.dataset.id === id));
  // 페이지 맨 아래(푸터)에 닿으면 교수자 메뉴 강조
  const atBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  let lastSeen = "hero";
  const onScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 8);
    setActive(atBottom() ? "instructor" : lastSeen);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) lastSeen = en.target.id; });
    setActive(atBottom() ? "instructor" : lastSeen);
  }, { rootMargin: "-45% 0px -50% 0px" });
  C.menu.forEach((m) => { const el = document.getElementById(m.id); if (el) spy.observe(el); });

  /* ---------- 카드 등장 효과 & 숫자 카운트 ---------- */
  const rev = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      $$(".count", en.target).forEach(countUp);
      rev.unobserve(en.target);
    });
  }, { threshold: 0.12 });
  $$(".reveal").forEach((el) => rev.observe(el));
})();
