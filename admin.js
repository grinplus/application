/* =========================================================
   관리자 모드 — 오른쪽 위 자물쇠 → 비밀번호 → 관리자 화면
   · 사이트 정보 / 섹션 내용 고치기  · 수강생 명단  · 공지
   · 출석 / 과제 / 수강 신청 내역 확인 + 엑셀(CSV) 내려받기
   · 설정 파일 저장 / 불러오기 · 비밀번호 변경
   (보통은 이 파일을 고칠 필요가 없습니다)
   ========================================================= */
(function () {
  const X = window.SITE;
  if (!X || !X.api) return;
  const { C, esc, $, $$, weeks, fmtDate, api, store, LIVE, pad } = X;
  const btn = $("#adminBtn");
  if (!btn) return;

  /* ---------- SHA-256 (비밀번호를 해시값으로만 비교) ---------- */
  const sha256 = (str) => {
    const primes = [];
    for (let n = 2; primes.length < 64; n++) if (primes.every((p) => n % p)) primes.push(n);
    const frac = (x) => ((x - Math.floor(x)) * 4294967296) | 0;
    const K = primes.map((p) => frac(Math.cbrt(p)));
    let H = primes.slice(0, 8).map((p) => frac(Math.sqrt(p)));
    const bytes = Array.from(new TextEncoder().encode(str));
    const bits = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (bits >>> (i * 8)) & 0xff);
    const r = (x, n) => (x >>> n) | (x << (32 - n));
    const w = new Array(64);
    for (let i = 0; i < bytes.length; i += 64) {
      for (let t = 0; t < 16; t++) w[t] = (bytes[i + 4 * t] << 24) | (bytes[i + 4 * t + 1] << 16) | (bytes[i + 4 * t + 2] << 8) | bytes[i + 4 * t + 3];
      for (let t = 16; t < 64; t++) {
        const s0 = r(w[t - 15], 7) ^ r(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = r(w[t - 2], 17) ^ r(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let t = 0; t < 64; t++) {
        const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + w[t]) | 0;
        const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H = [a, b, c, d, e, f, g, h].map((v, k) => (v + H[k]) | 0);
    }
    return H.map((v) => (v >>> 0).toString(16).padStart(8, "0")).join("");
  };
  const hashPw = (pw, salt) => sha256(`${salt || ""}::${pw}`);
  X.sha256 = sha256;

  /* ---------- 관리자 로그인 상태
     새로고침하거나 새 탭을 열어도 12시간 동안 유지 ('잠그기'를 누르면 바로 잠김) ---------- */
  const ss = {
    get(k) { try { return sessionStorage.getItem("rw_" + k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem("rw_" + k, v); } catch (e) {} },
    del(k) { try { sessionStorage.removeItem("rw_" + k); } catch (e) {} }
  };
  const ADMIN_HOURS = 12;
  const loadAdmin = () => {
    try {
      const o = JSON.parse(localStorage.getItem("rw_admin") || "null");
      if (o && o.token && o.exp > Date.now()) return o.token;
      localStorage.removeItem("rw_admin");
    } catch (e) {}
    return ss.get("adminToken");                     // 저장소를 못 쓰는 환경: 이 탭에서만 유지
  };
  const saveAdmin = (t) => {
    ss.set("adminToken", t);
    try { localStorage.setItem("rw_admin", JSON.stringify({ token: t, exp: Date.now() + ADMIN_HOURS * 3600e3 })); } catch (e) {}
  };
  const clearAdmin = () => {
    ss.del("adminToken"); ss.del("panel");
    try { localStorage.removeItem("rw_admin"); } catch (e) {}
  };
  let adminToken = loadAdmin();
  // 다른 탭에서 잠그면 이 탭도 잠김
  window.addEventListener("storage", (e) => {
    if (e.key === "rw_admin" && !e.newValue && adminToken) { adminToken = null; ss.del("adminToken"); if (panel) closePanel(true); syncBtn(); }
  });
  const syncBtn = () => {
    btn.classList.toggle("unlocked", !!adminToken);
    btn.classList.toggle("has-override", !!adminToken && !!window.SITE_CONFIG_OVERRIDDEN);   // 수정본 적용 중 표시 (관리자에게만)
    btn.setAttribute("aria-label", adminToken ? "관리자 화면 열기" : "Admin (locked)");
    btn.title = adminToken ? "관리자 화면 열기" : "Admin";
    X.adminToken = adminToken;                       // 사이트 화면의 관리자 전용 도구(설문 숨기기 등)에 알림
    document.dispatchEvent(new Event("rw-admin"));
  };
  syncBtn();

  /* ---------- 공통 도우미 ---------- */
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const fmtAt = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d) ? String(iso) : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const cell = (v) => {
    let s = v == null ? "" : String(v);
    if (/^[=+@]/.test(s) || /^-[^0-9]/.test(s)) s = "'" + s;          // 엑셀 수식으로 실행되지 않게
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const toCSV = (rows) => "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");   // BOM: 엑셀 한글 깨짐 방지
  const download = (name, text, type) => {
    const blob = new Blob([text], { type: type || "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
  const parseTable = (text) => text.split(/\r?\n/).map((line) => {
    if (!line.trim()) return null;
    const out = []; let cur = "", q = false;
    const sep = line.includes("\t") ? "\t" : ",";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === sep) { out.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out.map((v) => v.replace(/^'/, ""));
  }).filter(Boolean);
  const toast = (text, type) => {
    const t = document.createElement("div");
    t.className = "toast " + (type || "ok");
    t.setAttribute("role", "status");
    t.textContent = text;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2600);
  };

  /* =========================================================
     비밀번호 입력 창
     ========================================================= */
  let fails = 0, lockedUntil = 0;
  const openLogin = () => {
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `
      <form class="modal admin-login" role="dialog" aria-modal="true" aria-labelledby="alTitle" novalidate>
        <button class="modal-x" type="button" aria-label="닫기">×</button>
        <div class="modal-body">
          <div class="login-icon">🔒</div>
          <h2 id="alTitle">관리자 모드</h2>
          <p>관리자 비밀번호를 입력하세요.</p>
          <div class="field"><label for="alPw" class="sr-only">비밀번호</label>
            <input id="alPw" type="password" autocomplete="current-password" placeholder="비밀번호"></div>
          <div class="form-msg" role="alert"></div>
          <button class="btn btn-lg modal-cta" type="submit">확인</button>
        </div>
      </form>`;
    document.body.appendChild(wrap);
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => wrap.classList.add("show"));
    const form = $("form", wrap), input = $("#alPw", wrap), msg = $(".form-msg", wrap);
    input.focus();
    const close = () => {
      wrap.classList.remove("show");
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", onKey);
      setTimeout(() => wrap.remove(), 250);
      btn.focus({ preventScroll: true });
    };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    wrap.addEventListener("click", (e) => { if (e.target === wrap || e.target.closest(".modal-x")) close(); });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const show = (t) => { msg.className = "form-msg show no"; msg.textContent = t; };
      if (Date.now() < lockedUntil) return show(`잠시 후 다시 시도하세요. (${Math.ceil((lockedUntil - Date.now()) / 1000)}초)`);
      const pw = input.value;
      if (!pw) return show("비밀번호를 입력해 주세요.");
      const A = C.admin || {};
      if (!A.passwordHash || hashPw(pw, A.salt) !== A.passwordHash) {
        fails++;
        input.select();
        if (fails >= 5) { lockedUntil = Date.now() + 30000; fails = 0; return show("5번 틀렸습니다. 30초 뒤에 다시 시도하세요."); }
        return show(`비밀번호가 맞지 않습니다. (${fails}/5)`);
      }
      const sb = $("button[type=submit]", form);
      sb.disabled = true;
      api("adminLogin", { password: pw })
        .then((res) => {
          fails = 0;
          adminToken = res.adminToken || "demo";
          saveAdmin(adminToken);
          syncBtn();
          close();
          openPanel();
        })
        .catch((err) => { show(err.message); sb.disabled = false; });
    });
  };

  /* =========================================================
     관리자 화면
     ========================================================= */
  const TABS = [
    ["overview", "개요"], ["site", "사이트 정보"], ["sections", "섹션 내용"], ["roster", "강의 관리"],
    ["notices", "공지"], ["attendance", "출석"], ["submissions", "과제"], ["applications", "수강 신청"], ["file", "설정 파일"]
  ];
  const SECTION_NAMES = {
    site: "기본 정보", hero: "첫 화면", info: "강의 개요", popup: "안내 팝업", schedule: "수업 일정", instructor: "교수자 소개",
    menu: "상단 메뉴", stats: "통계 카드", strengths: "장점 슬라이드", curriculum: "주차별 강의", calendar: "수업 달력",
    vote: "주제 투표", apply: "수강 신청서", student: "출석·과제", tools: "AI 도구", prepare: "수강 준비물",
    readings: "Reading 자료", quiz: "문제풀이", faq: "자주 묻는 질문", notices: "공지사항 (제목·기본 공지)",
    infographic: "프로그램 인포그래픽"
  };
  const SITE_KEYS = ["site", "hero", "info", "popup", "schedule", "instructor"];
  const CONTENT_KEYS = ["curriculum", "stats", "strengths", "calendar", "vote", "apply", "student", "tools", "prepare", "readings", "quiz", "faq", "infographic", "notices", "menu"];
  const LABELS = {
    title: "제목", subtitle: "부제", lead: "설명 문구", text: "내용", badge: "배지", label: "이름", value: "값", sub: "보조 문구",
    icon: "아이콘", items: "항목", footer: "푸터 문구", button: "버튼", applyButton: "수강 신청 버튼", curriculumButton: "커리큘럼 버튼",
    link: "링크 주소", target: "이동할 섹션 id", suffix: "단위", weeks: "주차", summary: "요약", contents: "학습 내용",
    videos: "참고 영상 (YouTube 주소면 바로 재생)", materials: "수업 자료 (Google Drive 링크)", url: "주소", assignment: "과제", desc: "설명", due: "마감 (YYYY-MM-DD HH:MM)", submit: "제출 주소(선택)",
    date: "날짜 (YYYY-MM-DD)", time: "시간", place: "수업 방식", onlineLink: "온라인 수업 입장 주소 (Zoom 등)", bioLabel: "소개 제목", careerLabel: "경력 제목", name: "이름", use: "용도", tag: "분류", author: "저자",
    options: "보기", answer: "정답", explain: "해설", question: "문제", type: "유형", q: "질문", a: "답변", photo: "사진 경로",
    role: "소속 / 직함", bio: "소개", career: "경력", email: "이메일", office: "면담 안내", startDate: "첫 수업일 (YYYY-MM-DD)",
    holidays: "휴강일", submitLink: "외부 제출 주소(선택)", points: "안내 항목", enabled: "사용", delaySeconds: "표시 지연(초)",
    refreshSeconds: "결과 갱신 간격(초)", fields: "입력 항목", required: "필수", placeholder: "입력 예시", pattern: "형식 검사(정규식)",
    patternMessage: "형식 오류 안내", consent: "동의 문구", successMessage: "완료 메시지", pinLabel: "비밀번호 안내 문구",
    maxFileMB: "최대 파일 크기(MB)", accept: "허용 파일 형식", allowLate: "마감 후 제출 허용", body: "내용", important: "중요",
    id: "이동할 섹션 id", menu: "메뉴 항목", version: "버전 (제목 옆 회색 글씨)",
    facts: "핵심 숫자", phases: "학습 단계", from: "시작 주차", to: "끝 주차", session: "수업 구성",
    minutes: "시간(분)", sessionTitle: "수업 구성 제목", assessment: "평가 항목", percent: "비율(%)",
    assessmentTitle: "평가 제목", outcomes: "학습 성과", outcomesTitle: "학습 성과 제목"
  };
  const TEMPLATES = {
    holidays: { date: "", name: "" }, videos: { title: "", url: "" }, materials: { title: "", url: "" }, career: "", contents: "", points: "", options: "",
    assignment: { title: "", desc: "", due: "", submit: "" }
  };

  let draft = null;          // 고치는 중인 설정 사본
  let dirty = false;
  let data = null;           // 출석·과제·신청·명단
  let roster = null;
  let notices = null;
  let current = "overview";
  let currentSection = null;
  let panel = null;

  const loadData = (force) => {
    if (data && !force) return Promise.resolve(data);
    return api("adminData", { adminToken }).then((res) => {
      data = res;
      roster = (res.roster || []).map((r) => ({ sid: String(r.sid), name: String(r.name), pin: String(r.pin == null ? "" : r.pin), status: r.status || "approved", createdAt: r.createdAt || r.created_at || "" }));
      return data;
    });
  };
  const loadNotices = () => api("getNotices").then((r) => (notices = (r.notices || []).slice()));

  const openPanel = (tab) => {
    if (panel) return;
    draft = JSON.parse(JSON.stringify(window.SITE_CONFIG));
    dirty = false;
    current = tab || current;
    panel = document.createElement("div");
    panel.className = "admin";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "관리자 화면");
    panel.innerHTML = `
      <header class="admin-top">
        <strong class="admin-title">🔓 관리자 화면</strong>
        <span class="chip ${LIVE ? "now" : "hw open"}">${LIVE ? "운영 모드" : "체험 모드"}</span>
        <span class="admin-spacer"></span>
        <a class="btn ghost small" href="guide.html" target="_blank" rel="noopener">사용 안내서</a>
        <button class="btn ghost small" type="button" data-act="lock">잠그기</button>
        <button class="admin-x" type="button" data-act="close" aria-label="관리자 화면 닫기">×</button>
      </header>
      <nav class="admin-tabs" role="tablist" aria-label="관리 메뉴">
        ${TABS.map(([id, label]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${id === current}">${label}</button>`).join("")}
      </nav>
      <div class="admin-main" id="adminMain" role="tabpanel"></div>`;
    document.body.appendChild(panel);
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => panel.classList.add("show"));

    panel.addEventListener("click", (e) => {
      const t = e.target.closest("[data-tab]");
      if (t) return showTab(t.dataset.tab);
      const a = e.target.closest("[data-act]");
      if (!a) return;
      if (a.dataset.act === "close") closePanel();
      if (a.dataset.act === "lock") {
        if (!confirmLeave()) return;
        adminToken = null;
        clearAdmin();
        syncBtn();
        closePanel(true);
        toast("관리자 모드를 잠갔습니다.");
      }
    });
    document.addEventListener("keydown", onPanelKey);
    showTab(current);
    $(`[data-tab="${current}"]`, panel).focus();
  };
  const onPanelKey = (e) => { if (e.key === "Escape" && !document.querySelector(".modal-backdrop")) closePanel(); };
  const confirmLeave = () => !dirty || window.confirm("저장하지 않은 수정 내용이 있습니다. 버리고 나갈까요?");
  const closePanel = (force) => {
    if (!panel || (!force && !confirmLeave())) return;
    panel.classList.remove("show");
    document.body.classList.remove("modal-open");
    document.removeEventListener("keydown", onPanelKey);
    const p = panel;
    panel = null;
    ss.del("panel");                                 // 닫았으면 새로고침해도 다시 열지 않음
    setTimeout(() => p.remove(), 250);
    btn.focus({ preventScroll: true });
  };

  const main = () => $("#adminMain", panel);
  const showTab = (id) => {
    if ((current === "site" || current === "sections") && id !== current && dirty && !confirmLeave()) return;
    if (id !== current && (current === "site" || current === "sections")) { draft = JSON.parse(JSON.stringify(window.SITE_CONFIG)); dirty = false; }
    current = id;
    ss.set("panel", id);                             // 새로고침하면 이 탭으로 다시 열림
    $$("[data-tab]", panel).forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === id)));
    const el = main();
    el.scrollTop = 0;
    el.innerHTML = `<p class="muted admin-loading">불러오는 중…</p>`;
    const run = { overview: tabOverview, site: () => tabEditor(SITE_KEYS), sections: () => tabEditor(CONTENT_KEYS),
      roster: tabRoster, notices: tabNotices, attendance: tabAttendance, submissions: tabSubmissions,
      applications: tabApplications, file: tabFile }[id];
    Promise.resolve().then(run).catch((err) => {
      el.innerHTML = `<div class="form-msg show no">${esc(err.message)}</div>`;
      if (/관리자|로그인/.test(err.message)) { adminToken = null; clearAdmin(); syncBtn(); }
    });
  };
  const head = (title, desc, actions) => `
    <div class="admin-head">
      <div><h2>${esc(title)}</h2>${desc ? `<p>${desc}</p>` : ""}</div>
      ${actions ? `<div class="admin-actions">${actions}</div>` : ""}
    </div>`;
  const modeTip = LIVE ? "" : `<p class="mode-note">🧪 체험 모드: 이 브라우저에 쌓인 데이터만 보입니다. 모든 수강생의 데이터를 모으려면 안내서의 '운영 모드 연결'을 따라 주세요.</p>`;

  /* ---------- 개요 ---------- */
  const tabOverview = () => Promise.all([loadData(true), loadNotices()]).then(() => {
    const past = weeks.filter((w) => w.date <= new Date());
    const lastW = past[past.length - 1];
    const lastAtt = lastW ? data.attendance.filter((a) => Number(a.week) === lastW.no).length : 0;
    const hw = weeks.filter((w) => w.assignment);
    main().innerHTML = `
      ${head("개요", "수업 운영 현황을 한눈에 확인합니다.")}
      ${modeTip}
      <div class="admin-stats">
        <button class="card a-stat" data-tab="applications"><b>${data.applications.length}</b><span>수강 신청</span></button>
        <button class="card a-stat" data-tab="roster"><b>${roster.filter((r) => r.status === "approved").length}${roster.some((r) => r.status !== "approved") ? `<small> · 대기 ${roster.filter((r) => r.status !== "approved").length}</small>` : ""}</b><span>승인된 수강생</span></button>
        <button class="card a-stat" data-tab="attendance"><b>${lastW ? `${lastAtt}<small>/${roster.length || "-"}</small>` : "-"}</b><span>${lastW ? `최근 출석 (${lastW.no}주차)` : "최근 출석"}</span></button>
        <button class="card a-stat" data-tab="submissions"><b>${data.submissions.length}</b><span>과제 제출</span></button>
        <button class="card a-stat" data-tab="notices"><b>${notices.length}</b><span>공지</span></button>
      </div>
      <div class="admin-grid2">
        <div class="card">
          <h3>다가오는 과제 마감</h3>
          <ul class="a-list">${hw.filter((w) => w.due > new Date()).slice(0, 4).map((w) => {
            const n = new Set(data.submissions.filter((s) => Number(s.week) === w.no).map((s) => s.sid)).size;
            return `<li><span class="chip hw ${X.remain(w.due).cls}">${esc(X.remain(w.due).dday)}</span> ${w.no}주차 · ${esc(w.assignment.title)} <small>제출 ${n}명</small></li>`;
          }).join("") || "<li class='muted'>남은 과제가 없습니다.</li>"}</ul>
        </div>
        <div class="card">
          <h3>빠른 작업</h3>
          <div class="quick">
            <button class="btn ghost small" data-tab="notices">📢 공지 올리기</button>
            <button class="btn ghost small" data-tab="roster">👥 강의 관리</button>
            <button class="btn ghost small" data-tab="site">✏️ 사이트 정보 고치기</button>
            <button class="btn ghost small" data-tab="file">💾 설정 파일 저장</button>
          </div>
          ${window.SITE_CONFIG_OVERRIDDEN ? `<p class="mode-note">이 브라우저에는 화면에서 고친 설정이 적용되어 있습니다. 모든 방문자에게 반영하려면 [설정 파일] 탭에서 config.js 를 내려받아 사이트 파일을 바꿔 주세요.</p>` : ""}
        </div>
      </div>`;
  });

  /* ---------- 설정 편집기 (사이트 정보 / 섹션 내용) ---------- */
  const getAt = (obj, path) => path.reduce((o, k) => (o == null ? o : o[k]), obj);
  const setAt = (obj, path, v) => { const last = path[path.length - 1]; getAt(obj, path.slice(0, -1))[last] = v; };
  const P = (path) => esc(JSON.stringify(path));
  const blank = (v) => {
    if (Array.isArray(v)) return [];
    if (v && typeof v === "object") { const o = {}; Object.keys(v).forEach((k) => (o[k] = k === "id" ? v[k] : blank(v[k]))); return o; }
    return typeof v === "number" ? 0 : typeof v === "boolean" ? false : "";
  };
  const itemTitle = (v, i) => {
    if (v && typeof v === "object") return v.title || v.label || v.name || v.q || v.question || v.date || `${i + 1}번째`;
    return String(v);
  };

  const field = (val, path, key) => {
    if (key === "id" && path.length === 2) return "";       // 섹션 자체의 id 는 메뉴 연결용이라 숨김
    const label = LABELS[key] || key;
    const p = P(path);
    if (Array.isArray(val)) return arrayEd(val, path, label, key);
    if (val && typeof val === "object") {
      return `<fieldset class="ed-obj"><legend>${esc(label)}</legend>
        ${Object.keys(val).map((k) => field(val[k], path.concat(k), k)).join("")}
      </fieldset>`;
    }
    if (typeof val === "boolean") return `<label class="ed-check"><input type="checkbox" data-path="${p}" ${val ? "checked" : ""}> ${esc(label)}</label>`;
    if (typeof val === "number") return `<label class="ed-row"><span>${esc(label)}</span><input type="number" data-path="${p}" value="${esc(val)}"></label>`;
    const long = String(val).length > 60 || /\n/.test(val) || ["text", "bio", "body", "desc", "summary", "explain", "a", "lead", "successMessage", "consent"].includes(key);
    return `<label class="ed-row"><span>${esc(label)}</span>${long
      ? `<textarea data-path="${p}" rows="3">${esc(val)}</textarea>`
      : `<input type="text" data-path="${p}" value="${esc(val)}">`}</label>`;
  };
  const arrayEd = (arr, path, label, key) => {
    const p = P(path);
    const prim = arr.length ? typeof arr[0] !== "object" : typeof TEMPLATES[key] === "string";
    return `<div class="ed-arr" data-arr="${p}">
      <div class="ed-arr-head"><span>${esc(label)}</span><small>${arr.length}개</small></div>
      ${arr.map((v, i) => {
        const ip = path.concat(i);
        const tools = `<span class="ed-tools">
            <button type="button" data-op="up" data-path="${p}" data-i="${i}" aria-label="위로" ${i === 0 ? "disabled" : ""}>↑</button>
            <button type="button" data-op="down" data-path="${p}" data-i="${i}" aria-label="아래로" ${i === arr.length - 1 ? "disabled" : ""}>↓</button>
            <button type="button" data-op="del" data-path="${p}" data-i="${i}" aria-label="삭제">✕</button></span>`;
        if (prim) return `<div class="ed-prim"><input type="text" data-path="${P(ip)}" value="${esc(v)}" aria-label="${esc(label)} ${i + 1}">${tools}</div>`;
        return `<details class="ed-item" data-ip="${P(ip)}"><summary><b>${path[path.length - 1] === "weeks" ? `${i + 1}주차 · ` : `${i + 1}. `}</b>${esc(itemTitle(v, i))}${tools}</summary>
          <div class="ed-item-body">${Object.keys(v).map((k) => field(v[k], ip.concat(k), k)).join("")}
          ${path.length === 2 && path[0] === "curriculum" && path[1] === "weeks" ? (v.assignment
            ? `<button type="button" class="btn ghost small" data-op="delkey" data-key="assignment" data-path="${P(ip)}">과제 삭제</button>`
            : `<button type="button" class="btn ghost small" data-op="addkey" data-key="assignment" data-path="${P(ip)}">+ 과제 추가</button>`) : ""}
          </div></details>`;
      }).join("")}
      <button type="button" class="btn ghost small ed-add" data-op="add" data-path="${p}" data-key="${esc(key)}">+ ${esc(label)} 추가</button>
    </div>`;
  };

  const tabEditor = (keys) => {
    const valid = keys.filter((k) => draft[k] !== undefined);
    if (!currentSection || !valid.includes(currentSection)) currentSection = valid[0];
    const isSite = keys === SITE_KEYS;
    main().innerHTML = `
      ${head(isSite ? "사이트 정보" : "섹션 내용", "고친 뒤 아래 <b>저장하고 적용</b>을 누르면 이 브라우저에서 바로 확인할 수 있습니다. 모든 방문자에게 반영하려면 [설정 파일] 탭에서 config.js 를 내려받아 바꿔 주세요.")}
      <div class="ed-layout">
        <div class="ed-side" role="tablist" aria-label="편집할 항목">
          ${valid.map((k) => `<button type="button" data-sec="${k}" aria-selected="${k === currentSection}">${esc(SECTION_NAMES[k] || k)}</button>`).join("")}
        </div>
        <div class="ed-form" id="edForm"></div>
      </div>
      <div class="ed-save">
        <span id="edDirty">${dirty ? "저장하지 않은 수정 내용이 있습니다." : "수정 사항 없음"}</span>
        <button type="button" class="btn ghost small" id="edRevert">되돌리기</button>
        <button type="button" class="btn" id="edSave">저장하고 적용</button>
      </div>`;
    const form = $("#edForm");
    const drawSection = (keepOpen) => {
      const k = currentSection;
      form.innerHTML = `<h3 class="ed-title">${esc(SECTION_NAMES[k] || k)}</h3>` +
        (draft[k] && typeof draft[k] === "object" && !Array.isArray(draft[k])
          ? Object.keys(draft[k]).map((key) => field(draft[k][key], [k, key], key)).join("")
          : field(draft[k], [k], k));
      (keepOpen || []).forEach((ip) => { const d = $(`.ed-item[data-ip="${CSS.escape(ip)}"]`, form); if (d) d.open = true; });
    };
    const markDirty = () => { dirty = true; $("#edDirty").textContent = "저장하지 않은 수정 내용이 있습니다."; $("#edDirty").className = "warn"; };
    drawSection();

    $(".ed-side", main()).addEventListener("click", (e) => {
      const b = e.target.closest("[data-sec]");
      if (!b) return;
      currentSection = b.dataset.sec;
      $$("[data-sec]", main()).forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      drawSection();
      form.scrollIntoView({ block: "start" });
    });
    form.addEventListener("input", (e) => {
      const el = e.target.closest("[data-path]");
      if (!el || el.matches("button")) return;
      const path = JSON.parse(el.dataset.path);
      const v = el.type === "checkbox" ? el.checked : el.type === "number" ? Number(el.value) : el.value;
      setAt(draft, path, v);
      markDirty();
    });
    form.addEventListener("click", (e) => {
      const b = e.target.closest("[data-op]");
      if (!b) return;
      e.preventDefault();
      const path = JSON.parse(b.dataset.path);
      const open = $$(".ed-item[open]", form).map((d) => d.dataset.ip);
      const op = b.dataset.op;
      if (op === "addkey") { getAt(draft, path)[b.dataset.key] = JSON.parse(JSON.stringify(TEMPLATES[b.dataset.key])); open.push(JSON.stringify(path)); }
      else if (op === "delkey") { if (!confirm("이 주차의 과제를 삭제할까요?")) return; delete getAt(draft, path)[b.dataset.key]; }
      else {
        const arr = getAt(draft, path), i = Number(b.dataset.i);
        if (op === "add") {
          const key = b.dataset.key;
          const item = arr.length ? blank(arr[arr.length - 1]) : JSON.parse(JSON.stringify(TEMPLATES[key] != null ? TEMPLATES[key] : ""));
          arr.push(item);
          open.push(JSON.stringify(path.concat(arr.length - 1)));
        }
        if (op === "del") { if (!confirm(`${i + 1}번째 항목을 삭제할까요?`)) return; arr.splice(i, 1); }
        if (op === "up" && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
        if (op === "down" && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
      }
      markDirty();
      drawSection(open);
    });
    $("#edRevert").addEventListener("click", () => {
      if (!dirty || !confirm("수정한 내용을 모두 되돌릴까요?")) return;
      draft = JSON.parse(JSON.stringify(window.SITE_CONFIG));
      dirty = false;
      tabEditor(keys);
    });
    $("#edSave").addEventListener("click", () => saveConfig(draft, current));
  };

  const saveConfig = (cfg, reopenTab) => {
    try {
      localStorage.setItem("rw_config_override", JSON.stringify(cfg));
      localStorage.setItem("rw_config_base", JSON.stringify(window.SITE_CONFIG_ORIGINAL));   // 어떤 config.js 를 바탕으로 고쳤는지
    } catch (e) {
      return toast("이 브라우저에 저장할 수 없습니다. [설정 파일] 탭에서 파일로 내려받아 주세요.", "no");
    }
    dirty = false;
    ss.set("reopen", reopenTab || "overview");
    location.reload();
  };

  /* ---------- 강의 관리: 수강생 현황(승인) · 주차별 출석 현황 · 주차별 과제 제출 현황 ---------- */
  const tabRoster = () => loadData(true).then(function draw() {
    const apps = {};
    (data.applications || []).forEach((a) => { if (a.sid) apps[String(a.sid)] = a; });
    const now = new Date();
    const todayD = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const pastWeeks = weeks.filter((w) => w.date <= now);
    const hw = weeks.filter((w) => w.assignment && w.due);
    const att = {};
    data.attendance.forEach((a) => { att[`${a.sid}|${a.week}`] = a.at; });
    const subs = {};
    data.submissions.forEach((s) => { const k = `${s.sid}|${s.week}`; if (!subs[k] || s.at > subs[k].at) subs[k] = s; });
    const attN = (sid) => weeks.filter((w) => att[`${sid}|${w.no}`]).length;
    const subN = (sid) => hw.filter((w) => subs[`${sid}|${w.no}`]).length;
    const nApproved = roster.filter((r) => r.status === "approved").length;
    const nPending = roster.length - nApproved;
    const filter = draw.filter || "all";
    const list = roster
      .filter((r) => filter === "all" || r.status === filter)
      .sort((a, b) => (a.status === b.status ? String(a.createdAt).localeCompare(String(b.createdAt)) : a.status === "pending" ? -1 : 1));
    const approved = roster.filter((r) => r.status === "approved").sort((a, b) => a.sid.localeCompare(b.sid));
    const fmtDay = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
    const attSt = (sid, w) => (att[`${sid}|${w.no}`] ? "ok" : w.date < todayD ? "miss" : w.date.toDateString() === now.toDateString() ? "today" : "future");
    const subSt = (sid, w) => { const s = subs[`${sid}|${w.no}`]; return s ? (s.late ? "late" : "ok") : w.due < now ? "miss" : "open"; };

    main().innerHTML = `
      ${head("강의 관리", "수강 신청을 하면 아래 명단에 <b>승인 대기</b>로 자동 등록됩니다. <b>승인</b>한 수강생만 로그인해 주차별 학습 내용을 보고, 출석·과제를 할 수 있습니다.",
        `${refreshBtn}<button class="btn ghost small" id="rsExport">명단 내려받기</button>`)}
      ${modeTip}

      <div class="card">
        <div class="admin-head small">
          <h3>수강생 현황 <small>전체 ${roster.length}명 · 승인 ${nApproved}명 · 대기 ${nPending}명</small></h3>
          <div class="admin-actions">
            <span class="rs-filter" role="group" aria-label="보기">
              ${[["all", "전체"], ["pending", "승인 대기"], ["approved", "승인됨"]].map(([k, l]) => `<button type="button" class="btn ghost small" data-filter="${k}" aria-pressed="${filter === k}">${l}</button>`).join("")}
            </span>
            ${nPending ? `<button type="button" class="btn small" id="rsApproveAll">대기 ${nPending}명 모두 승인</button>` : ""}
            <button type="button" class="btn ghost small" id="rsAdd">+ 직접 추가</button>
          </div>
        </div>
        <form class="rs-add" id="rsAddForm" hidden novalidate>
          <input id="rsSid" inputmode="numeric" placeholder="학번" aria-label="학번">
          <input id="rsName" placeholder="이름" aria-label="이름">
          <input id="rsPinNew" inputmode="numeric" maxlength="4" placeholder="PIN (비우면 자동)" aria-label="PIN">
          <button class="btn small" type="submit">추가 (승인됨)</button>
          <button class="btn ghost small" type="button" id="rsAddCancel">취소</button>
        </form>
        <div class="form-msg" id="rsMsg" role="status"></div>
        ${list.length ? `<div class="table-wrap"><table class="a-table rs-table">
          <thead><tr><th>#</th><th>상태</th><th>학번</th><th>이름</th><th>학과</th><th>학년</th><th>이메일</th><th>PIN</th><th>신청일</th>
            <th title="출석한 주 / 지난 수업">출석</th><th title="제출한 과제 / 전체 과제">과제</th><th>관리</th></tr></thead>
          <tbody>${list.map((r, i) => {
            const a = apps[r.sid] || {};
            const ok = r.status === "approved";
            return `<tr class="${ok ? "" : "rs-pending"}">
              <td>${i + 1}</td>
              <td>${ok ? `<span class="chip now">승인</span>` : `<span class="chip hw open">승인 대기</span>`}</td>
              <td>${esc(r.sid)}</td><td><b>${esc(r.name)}</b></td>
              <td>${esc(a.major || "")}</td><td>${esc(a.year || "")}</td>
              <td class="wrap">${a.email ? `<a href="mailto:${esc(a.email)}">${esc(a.email)}</a>` : ""}</td>
              <td><code>${esc(r.pin)}</code></td>
              <td>${esc(fmtDay(a.at || r.createdAt))}</td>
              <td>${ok ? `${attN(r.sid)}<small>/${pastWeeks.length}</small>` : "-"}</td>
              <td>${ok ? `${subN(r.sid)}<small>/${hw.length}</small>` : "-"}</td>
              <td class="rs-tools">
                ${ok ? `<button type="button" class="btn ghost small" data-unapprove="${esc(r.sid)}">승인 취소</button>`
                     : `<button type="button" class="btn small" data-approve="${esc(r.sid)}">승인</button>`}
                <button type="button" class="btn ghost small" data-pin="${esc(r.sid)}">PIN 변경</button>
                <button type="button" class="icon-btn" data-remove="${esc(r.sid)}" aria-label="${esc(r.name)} 삭제">✕</button>
              </td>
            </tr>`;
          }).join("")}</tbody>
        </table></div>` : `<p class="muted center">${roster.length ? "이 보기에 해당하는 수강생이 없습니다." : "아직 수강 신청한 학생이 없습니다. 수강 신청서를 제출하면 여기에 '승인 대기'로 나타납니다."}</p>`}
      </div>

      <div class="card">
        <div class="admin-head small"><h3>주차별 출석 현황 <small>승인된 수강생 ${approved.length}명 · ✓ 출석 · ✕ 결석 · 빈칸은 수업 전</small></h3></div>
        ${approved.length ? `<div class="table-wrap"><table class="a-table att-table">
          <thead><tr><th class="sticky">학번</th><th class="sticky2">이름</th>${weeks.map((w) => `<th title="${esc(fmtDate(w.date))}">${w.no}주<br><small>${w.date.getMonth() + 1}/${w.date.getDate()}</small></th>`).join("")}<th>출석</th></tr></thead>
          <tbody>${approved.map((s) => `<tr><td class="sticky">${esc(s.sid)}</td><td class="sticky2">${esc(s.name)}</td>${weeks.map((w) => {
            const st = attSt(s.sid, w);
            return `<td class="at ${st}" title="${st === "ok" ? esc(fmtAt(att[`${s.sid}|${w.no}`])) : ""}">${{ ok: "✓", miss: "✕", today: "·", future: "" }[st]}</td>`;
          }).join("")}<td><b>${attN(s.sid)}</b></td></tr>`).join("")}</tbody>
          <tfoot><tr><td class="sticky">출석 인원</td><td class="sticky2"></td>${weeks.map((w) => `<td>${w.date <= now ? approved.filter((s) => att[`${s.sid}|${w.no}`]).length : ""}</td>`).join("")}<td></td></tr></tfoot>
        </table></div>` : `<p class="muted">승인된 수강생이 없습니다.</p>`}
      </div>

      <div class="card">
        <div class="admin-head small"><h3>주차별 과제 제출 현황 <small>✓ 제출 · 지각 · ✕ 미제출(마감 지남) · 빈칸은 마감 전</small></h3></div>
        ${approved.length && hw.length ? `<div class="table-wrap"><table class="a-table att-table sub-table">
          <thead><tr><th class="sticky">학번</th><th class="sticky2">이름</th>${hw.map((w) => `<th title="${esc(w.assignment.title)} · 마감 ${esc(X.fmtDateTime(w.due))}">${w.no}주<br><small>${esc(w.assignment.title.length > 10 ? w.assignment.title.slice(0, 10) + "…" : w.assignment.title)}</small></th>`).join("")}<th>제출</th></tr></thead>
          <tbody>${approved.map((s) => `<tr><td class="sticky">${esc(s.sid)}</td><td class="sticky2">${esc(s.name)}</td>${hw.map((w) => {
            const st = subSt(s.sid, w), sub = subs[`${s.sid}|${w.no}`];
            const mark = { ok: "✓", late: "지각", miss: "✕", open: "" }[st];
            return `<td class="sb ${st}" title="${sub ? esc(`${sub.fileName} · ${fmtAt(sub.at)}`) : ""}">${sub && sub.url ? `<a href="${esc(sub.url)}" target="_blank" rel="noopener">${mark}</a>` : mark}</td>`;
          }).join("")}<td><b>${subN(s.sid)}</b><small>/${hw.length}</small></td></tr>`).join("")}</tbody>
          <tfoot><tr><td class="sticky">제출 인원</td><td class="sticky2"></td>${hw.map((w) => `<td>${approved.filter((s) => subs[`${s.sid}|${w.no}`]).length}</td>`).join("")}<td></td></tr></tfoot>
        </table></div>` : `<p class="muted">${hw.length ? "승인된 수강생이 없습니다." : "등록된 과제가 없습니다."}</p>`}
      </div>`;

    bindRefresh(draw);
    const msg = $("#rsMsg");
    const say = (type, text) => { msg.className = `form-msg show ${type}`; msg.textContent = text; };
    const byId = (sid) => roster.find((r) => r.sid === sid);
    const act = (btn, call, after) => {
      btn.disabled = true;
      return call.then((res) => { after(res); draw(); }).catch((err) => { btn.disabled = false; say("no", err.message); });
    };

    $$("[data-filter]", main()).forEach((b) => b.addEventListener("click", () => { draw.filter = b.dataset.filter; draw(); }));
    $("#rsAdd").addEventListener("click", () => { $("#rsAddForm").hidden = false; $("#rsSid").focus(); });
    $("#rsAddCancel").addEventListener("click", () => { $("#rsAddForm").hidden = true; });
    $("#rsAddForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const sid = $("#rsSid").value.trim(), name = $("#rsName").value.trim(), pin = $("#rsPinNew").value.trim();
      if (!/^\d+$/.test(sid) || !name) return say("no", "학번(숫자)과 이름을 입력해 주세요.");
      if (pin && !/^\d{4}$/.test(pin)) return say("no", "PIN 은 숫자 4자리로 입력해 주세요. (비우면 자동으로 만들어 드립니다)");
      act(e.submitter || $("button[type=submit]", e.target), api("addStudent", { adminToken, sid, name, pin }), (res) => {
        roster.push({ sid, name, pin: res.pin || pin, status: "approved", createdAt: new Date().toISOString() });
        toast(`${name}(${sid}) 님을 추가했습니다. PIN ${res.pin || pin}`);
      });
    });
    const approveAll = $("#rsApproveAll");
    if (approveAll) approveAll.addEventListener("click", () => {
      const pend = roster.filter((r) => r.status !== "approved");
      if (!confirm(`승인 대기 중인 ${pend.length}명을 모두 승인할까요?`)) return;
      act(approveAll, pend.reduce((p, r) => p.then(() => api("setStudentStatus", { adminToken, sid: r.sid, status: "approved" })), Promise.resolve()),
        () => { pend.forEach((r) => (r.status = "approved")); toast(`${pend.length}명을 승인했습니다.`); });
    });
    main().querySelector(".rs-table") && main().querySelector(".rs-table").addEventListener("click", (e) => {
      const ap = e.target.closest("[data-approve]"), un = e.target.closest("[data-unapprove]");
      const pn = e.target.closest("[data-pin]"), rm = e.target.closest("[data-remove]");
      if (ap) { const r = byId(ap.dataset.approve); act(ap, api("setStudentStatus", { adminToken, sid: r.sid, status: "approved" }), () => { r.status = "approved"; toast(`${r.name} 님을 승인했습니다.`); }); }
      if (un) {
        const r = byId(un.dataset.unapprove);
        if (!confirm(`${r.name}(${r.sid}) 님의 승인을 취소할까요?\n취소하면 로그인과 주차별 학습 내용 열람이 막힙니다.`)) return;
        act(un, api("setStudentStatus", { adminToken, sid: r.sid, status: "pending" }), () => { r.status = "pending"; toast(`${r.name} 님의 승인을 취소했습니다.`); });
      }
      if (pn) {
        const r = byId(pn.dataset.pin);
        const v = prompt(`${r.name}(${r.sid}) 님의 새 PIN (숫자 4자리)`, r.pin);
        if (v == null) return;
        if (!/^\d{4}$/.test(v.trim())) return say("no", "PIN 은 숫자 4자리로 입력해 주세요.");
        act(pn, api("setStudentPin", { adminToken, sid: r.sid, pin: v.trim() }), () => { r.pin = v.trim(); toast(`${r.name} 님의 PIN 을 바꿨습니다.`); });
      }
      if (rm) {
        const r = byId(rm.dataset.remove);
        if (!confirm(`${r.name}(${r.sid}) 님을 명단에서 삭제할까요?\n수강 신청서·출석·과제 기록은 그대로 남습니다.`)) return;
        act(rm, api("deleteStudent", { adminToken, sid: r.sid }), () => { roster = roster.filter((x) => x.sid !== r.sid); data.roster = roster; toast(`${r.name} 님을 명단에서 삭제했습니다.`); });
      }
    });
    $("#rsExport").addEventListener("click", () => download(`수강생현황_${today()}.csv`, toCSV(
      [["학번", "이름", "상태", "PIN", "학과", "학년", "이메일", "신청일", "출석", "과제"]].concat(roster.map((r) => {
        const a = apps[r.sid] || {};
        return [r.sid, r.name, r.status === "approved" ? "승인" : "승인 대기", r.pin, a.major || "", a.year || "", a.email || "", fmtDay(a.at || r.createdAt), attN(r.sid), subN(r.sid)];
      })))));
  });

  /* ---------- 공지 ---------- */
  const tabNotices = () => loadNotices().then(() => {
    main().innerHTML = `
      ${head("공지", "올린 공지는 사이트의 '공지사항'에 바로 보입니다. '중요'로 올리면 첫 화면 위쪽에도 띠로 표시됩니다.")}
      ${LIVE ? "" : `<p class="mode-note">🧪 체험 모드: 공지가 이 브라우저에만 저장됩니다. 모든 방문자에게 보이게 하려면 운영 모드로 연결하거나, [설정 파일]을 내려받아 사이트에 반영하세요.</p>`}
      <form class="card nt-form" id="ntForm" novalidate>
        <h3 id="ntFormTitle">새 공지 쓰기</h3>
        <div class="field"><label for="ntTitle">제목 <span class="req">*</span></label><input id="ntTitle"><div class="field-error"></div></div>
        <div class="field"><label for="ntBody">내용 <span class="req">*</span></label><textarea id="ntBody" rows="4"></textarea><div class="field-error"></div></div>
        <div class="nt-row">
          <div class="field"><label for="ntDate">날짜</label><input id="ntDate" type="date" value="${today()}"></div>
          <label class="consent"><input type="checkbox" id="ntImp"> <span>중요 공지</span></label>
        </div>
        <div class="admin-actions"><button class="btn" type="submit" id="ntSubmit">공지 올리기</button><button class="btn ghost" type="button" id="ntCancel" hidden>수정 취소</button></div>
        <div class="form-msg" role="status"></div>
      </form>
      <div class="card">
        <h3>올린 공지 <small>${notices.length}개</small></h3>
        <ul class="nt-list" id="ntList"></ul>
      </div>`;
    let editing = -1;
    const form = $("#ntForm"), msg = $(".form-msg", form);
    const sorted = () => notices.map((n, i) => ({ n, i })).sort((a, b) => String(b.n.date).localeCompare(String(a.n.date)));
    const drawList = () => {
      $("#ntList").innerHTML = notices.length ? sorted().map(({ n, i }) => `
        <li>
          <div class="nt-main">${n.important ? `<span class="chip hw urgent">중요</span>` : ""} <b>${esc(n.title)}</b> <small>${esc(n.date || "")}</small>
            <p>${esc(n.body || "").replace(/\n/g, "<br>")}</p></div>
          <div class="nt-tools"><button class="btn ghost small" data-edit="${i}">수정</button><button class="btn ghost small" data-delete="${i}">삭제</button></div>
        </li>`).join("") : `<li class="muted">아직 올린 공지가 없습니다.</li>`;
    };
    drawList();
    const persist = (okText) => api("saveNotices", { adminToken, notices })
      .then(() => { msg.className = "form-msg show ok"; msg.textContent = okText; drawList(); X.refreshNotices && X.refreshNotices(); $("h3 small", main().lastElementChild).textContent = `${notices.length}개`; });
    const resetForm = () => { form.reset(); $("#ntDate").value = today(); editing = -1; $("#ntFormTitle").textContent = "새 공지 쓰기"; $("#ntSubmit").textContent = "공지 올리기"; $("#ntCancel").hidden = true; };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let bad = null;
      [["ntTitle", "제목"], ["ntBody", "내용"]].forEach(([id, label]) => {
        const el = $("#" + id), empty = !el.value.trim();
        el.closest(".field").classList.toggle("invalid", empty);
        $(".field-error", el.closest(".field")).textContent = empty ? `${label}을(를) 입력해 주세요.` : "";
        if (empty && !bad) bad = el;
      });
      if (bad) return bad.focus();
      const n = { date: $("#ntDate").value || today(), title: $("#ntTitle").value.trim(), body: $("#ntBody").value.trim(), important: $("#ntImp").checked };
      const wasEdit = editing > -1;
      if (wasEdit) notices[editing] = Object.assign({}, notices[editing], n); else notices.push(n);   // 일정 연결(eventId) 유지
      persist(wasEdit ? "공지를 수정했습니다." : "공지를 올렸습니다.").then(resetForm).catch((err) => { msg.className = "form-msg show no"; msg.textContent = err.message; });
    });
    $("#ntCancel").addEventListener("click", resetForm);
    $("#ntList").addEventListener("click", (e) => {
      const ed = e.target.closest("[data-edit]"), del = e.target.closest("[data-delete]");
      if (ed) {
        const n = notices[editing = Number(ed.dataset.edit)];
        $("#ntTitle").value = n.title; $("#ntBody").value = n.body || ""; $("#ntDate").value = n.date || today(); $("#ntImp").checked = !!n.important;
        $("#ntFormTitle").textContent = "공지 수정"; $("#ntSubmit").textContent = "수정 저장"; $("#ntCancel").hidden = false;
        form.scrollIntoView({ block: "start" }); $("#ntTitle").focus();
      }
      if (del && confirm("이 공지를 삭제할까요?")) {
        notices.splice(Number(del.dataset.delete), 1);
        resetForm();
        persist("공지를 삭제했습니다.").catch((err) => { msg.className = "form-msg show no"; msg.textContent = err.message; });
      }
    });
  });

  /* ---------- 출석 ---------- */
  const students = () => {
    const map = new Map();
    roster.forEach((r) => map.set(String(r.sid), r.name));
    data.attendance.concat(data.submissions).forEach((a) => { if (!map.has(String(a.sid))) map.set(String(a.sid), a.name || ""); });
    return [...map.entries()].map(([sid, name]) => ({ sid, name })).sort((a, b) => a.sid.localeCompare(b.sid));
  };
  const refreshBtn = `<button class="btn ghost small" data-refresh>새로고침</button>`;
  const bindRefresh = (fn) => { const b = $("[data-refresh]", main()); if (b) b.addEventListener("click", () => loadData(true).then(fn)); };

  const tabAttendance = () => loadData().then(function draw() {
    const list = students();
    const now = new Date();
    const att = {};
    data.attendance.forEach((a) => { att[`${a.sid}|${a.week}`] = a.at; });
    const status = (s, w) => (att[`${s.sid}|${w.no}`] ? "ok" : w.date < new Date(now.getFullYear(), now.getMonth(), now.getDate()) ? "miss" : w.date.toDateString() === now.toDateString() ? "today" : "future");
    main().innerHTML = `
      ${head("출석", "✓ 출석 · ✕ 결석 · 빈칸은 아직 수업 전입니다.", `${refreshBtn}<button class="btn small" id="atCsv">엑셀로 내려받기</button>`)}
      ${modeTip}
      ${list.length ? `<div class="table-wrap"><table class="a-table att-table">
        <thead><tr><th class="sticky">학번</th><th class="sticky2">이름</th>${weeks.map((w) => `<th title="${esc(fmtDate(w.date))}">${w.no}주<br><small>${w.date.getMonth() + 1}/${w.date.getDate()}</small></th>`).join("")}<th>출석</th></tr></thead>
        <tbody>${list.map((s) => {
          const okN = weeks.filter((w) => att[`${s.sid}|${w.no}`]).length;
          return `<tr><td class="sticky">${esc(s.sid)}</td><td class="sticky2">${esc(s.name)}</td>${weeks.map((w) => {
            const st = status(s, w);
            return `<td class="at ${st}" title="${st === "ok" ? esc(fmtAt(att[`${s.sid}|${w.no}`])) : ""}">${{ ok: "✓", miss: "✕", today: "·", future: "" }[st]}</td>`;
          }).join("")}<td><b>${okN}</b></td></tr>`;
        }).join("")}</tbody>
        <tfoot><tr><td class="sticky">합계</td><td class="sticky2"></td>${weeks.map((w) => `<td>${data.attendance.filter((a) => Number(a.week) === w.no).length || ""}</td>`).join("")}<td></td></tr></tfoot>
      </table></div>` : `<div class="card muted">아직 출석 기록이나 등록된 수강생이 없습니다.</div>`}`;
    bindRefresh(draw);
    const b = $("#atCsv");
    if (b) b.addEventListener("click", () => {
      const rows = [["학번", "이름"].concat(weeks.map((w) => `${w.no}주차(${w.date.getMonth() + 1}/${w.date.getDate()})`), ["출석 수"])];
      list.forEach((s) => rows.push([s.sid, s.name].concat(weeks.map((w) => ({ ok: "출석", miss: "결석", today: "", future: "" }[status(s, w)])), [weeks.filter((w) => att[`${s.sid}|${w.no}`]).length])));
      download(`출석부_${today()}.csv`, toCSV(rows));
    });
  });

  /* ---------- 과제 ---------- */
  const tabSubmissions = () => loadData().then(function draw() {
    const hw = weeks.filter((w) => w.assignment);
    const sel = draw.week || "all";
    const subs = data.submissions.filter((s) => sel === "all" || String(s.week) === String(sel)).sort((a, b) => (a.at < b.at ? 1 : -1));
    const w = sel === "all" ? null : weeks[Number(sel) - 1];
    const missing = w && roster.length ? roster.filter((r) => !data.submissions.some((s) => String(s.sid) === String(r.sid) && Number(s.week) === w.no)) : [];
    main().innerHTML = `
      ${head("과제", "수강생이 제출한 과제 목록입니다.", `${refreshBtn}<button class="btn small" id="sbCsv">엑셀로 내려받기</button>`)}
      ${modeTip}
      <div class="field inline-field"><label for="sbWeek">과제</label>
        <select id="sbWeek"><option value="all">전체 과제</option>${hw.map((x) => `<option value="${x.no}" ${String(sel) === String(x.no) ? "selected" : ""}>${x.no}주차 · ${esc(x.assignment.title)}</option>`).join("")}</select></div>
      ${w ? `<p class="muted">마감 ${esc(X.fmtDateTime(w.due))} · 제출 ${new Set(subs.map((s) => s.sid)).size}명${roster.length ? ` / ${roster.length}명` : ""}</p>` : ""}
      ${missing.length ? `<div class="card miss-box"><b>미제출 ${missing.length}명</b> <span>${missing.map((r) => esc(`${r.name}(${r.sid})`)).join(", ")}</span></div>` : ""}
      ${subs.length ? `<div class="table-wrap"><table class="a-table">
        <thead><tr><th>제출 시각</th><th>학번</th><th>이름</th><th>주차</th><th>파일</th><th>크기</th><th>상태</th></tr></thead>
        <tbody>${subs.map((s) => `<tr><td>${esc(fmtAt(s.at))}</td><td>${esc(s.sid)}</td><td>${esc(s.name)}</td><td>${esc(s.week)}주차</td>
          <td class="wrap">${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.fileName)}</a>` : esc(s.fileName)}</td>
          <td>${s.size ? esc(Math.max(1, Math.round(s.size / 1024))) + "KB" : ""}</td><td>${s.late ? `<span class="chip hw urgent">지각</span>` : `<span class="chip now">정상</span>`}</td></tr>`).join("")}</tbody>
      </table></div>` : `<div class="card muted">제출된 과제가 없습니다.</div>`}`;
    bindRefresh(draw);
    $("#sbWeek").addEventListener("change", (e) => { draw.week = e.target.value; draw(); });
    $("#sbCsv").addEventListener("click", () => {
      const rows = [["제출 시각", "학번", "이름", "주차", "과제", "파일명", "크기(KB)", "상태", "파일 링크"]];
      subs.forEach((s) => rows.push([fmtAt(s.at), s.sid, s.name, s.week, (weeks[s.week - 1] && weeks[s.week - 1].assignment ? weeks[s.week - 1].assignment.title : ""), s.fileName, s.size ? Math.max(1, Math.round(s.size / 1024)) : "", s.late ? "지각" : "정상", s.url || ""]));
      download(`과제제출_${sel === "all" ? "전체" : sel + "주차"}_${today()}.csv`, toCSV(rows));
    });
  });

  /* ---------- 수강 신청 ---------- */
  const tabApplications = () => loadData().then(function draw() {
    const fields = (C.apply && C.apply.fields) || [];
    const apps = data.applications.slice().sort((a, b) => (String(a.at) < String(b.at) ? 1 : -1));
    main().innerHTML = `
      ${head("수강 신청", `접수된 신청서 ${apps.length}건`, `${refreshBtn}<button class="btn ghost small" id="apRoster" ${apps.length ? "" : "disabled"}>신청자를 명단에 추가</button><button class="btn small" id="apCsv">엑셀로 내려받기</button>`)}
      ${modeTip}
      ${apps.length ? `<div class="table-wrap"><table class="a-table">
        <thead><tr><th>신청 시각</th>${fields.map((f) => `<th>${esc(f.label)}</th>`).join("")}</tr></thead>
        <tbody>${apps.map((a) => `<tr><td>${esc(fmtAt(a.at))}</td>${fields.map((f) => `<td class="${f.type === "textarea" ? "wrap long" : ""}">${esc(a[f.name])}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>` : `<div class="card muted">아직 접수된 신청서가 없습니다.</div>`}`;
    bindRefresh(draw);
    $("#apCsv").addEventListener("click", () => {
      const rows = [["신청 시각"].concat(fields.map((f) => f.label))];
      apps.forEach((a) => rows.push([fmtAt(a.at)].concat(fields.map((f) => a[f.name]))));
      download(`수강신청_${today()}.csv`, toCSV(rows));
    });
    $("#apRoster").addEventListener("click", () => {
      const add = apps.filter((a) => a.sid && !roster.some((r) => r.sid === String(a.sid)));
      if (!add.length) return toast("모든 신청자가 이미 명단에 있습니다.");
      if (!confirm(`신청자 ${add.length}명을 명단에 추가하고 PIN 을 자동으로 만들까요?`)) return;
      const next = roster.concat(add.map((a) => ({ sid: String(a.sid), name: a.name || "", pin: String(1000 + Math.floor(Math.random() * 9000)) })));
      api("saveRoster", { adminToken, roster: next }).then(() => { roster = next; data.roster = next; toast(`${add.length}명을 명단에 추가했습니다.`); showTab("roster"); })
        .catch((err) => toast(err.message, "no"));
    });
  });

  /* ---------- 설정 파일 · 비밀번호 ---------- */
  const configText = (cfg) =>
`/* =========================================================
   사이트 설정 파일 (관리자 화면에서 ${today()} 에 내려받음)
   - 이 파일로 사이트 폴더의 config.js 를 바꾸면 모든 방문자에게 반영됩니다.
   - 글자는 따옴표 "..." 안에서 고치면 됩니다. 자세한 설명은 guide.html 참고.
   ========================================================= */
window.SITE_CONFIG = ${JSON.stringify(cfg, null, 2)};
`;
  const parseConfig = (text) => {
    const t = text.replace(/^﻿/, "").trim();
    let cfg;
    if (t.startsWith("{")) cfg = JSON.parse(t);
    else {
      const fakeWindow = {};
      // 관리자가 직접 고른 config.js 파일만 읽습니다
      new Function("window", t)(fakeWindow);
      cfg = fakeWindow.SITE_CONFIG;
    }
    if (!cfg || typeof cfg !== "object" || !cfg.site || !Array.isArray(cfg.menu)) throw new Error("사이트 설정 파일이 아닙니다. (site, menu 항목이 없음)");
    return cfg;
  };

  const tabFile = () => {
    main().innerHTML = `
      ${head("설정 파일", "화면에서 고친 설정을 파일로 저장하고, 저장한 파일을 다시 불러올 수 있습니다.")}
      <div class="admin-grid2">
        <div class="card">
          <h3>💾 설정 파일로 저장</h3>
          <p class="muted">지금 적용된 설정을 <b>config.js</b> 로 내려받습니다. 사이트 폴더의 config.js 를 이 파일로 바꾸면 모든 방문자에게 반영됩니다.</p>
          <button class="btn" id="fiExport">config.js 내려받기</button>
        </div>
        <div class="card">
          <h3>📂 설정 파일 불러오기</h3>
          <p class="muted">전에 저장한 config.js (또는 .json) 를 불러와 이 브라우저에 적용합니다.</p>
          <label class="btn ghost file-btn">파일 선택<input type="file" id="fiImport" accept=".js,.json,.txt"></label>
          <div class="form-msg" id="fiMsg" role="status"></div>
        </div>
        <div class="card">
          <h3>↩️ 원래대로 되돌리기</h3>
          <p class="muted">${window.SITE_CONFIG_OVERRIDDEN ? "이 브라우저에 저장된 수정본을 지우고 사이트의 config.js 내용으로 돌아갑니다." : "현재 사이트의 config.js 내용 그대로 보고 있습니다."}</p>
          <button class="btn ghost" id="fiReset" ${window.SITE_CONFIG_OVERRIDDEN ? "" : "disabled"}>수정본 지우기</button>
        </div>
        <form class="card" id="pwForm" novalidate>
          <h3>🔑 관리자 비밀번호 변경</h3>
          <div class="field"><label for="pwNow">현재 비밀번호</label><input id="pwNow" type="password" autocomplete="current-password"></div>
          <div class="field"><label for="pwNew">새 비밀번호 (8자 이상)</label><input id="pwNew" type="password" autocomplete="new-password"></div>
          <div class="field"><label for="pwNew2">새 비밀번호 확인</label><input id="pwNew2" type="password" autocomplete="new-password"></div>
          <button class="btn" type="submit">비밀번호 바꾸기</button>
          <div class="form-msg" role="status"></div>
        </form>
      </div>`;
    $("#fiExport").addEventListener("click", () => { download("config.js", configText(window.SITE_CONFIG), "text/javascript;charset=utf-8"); toast("config.js 를 내려받았습니다."); });
    $("#fiImport").addEventListener("change", (e) => {
      const f = e.target.files[0];
      const msg = $("#fiMsg");
      if (!f) return;
      f.text().then((t) => {
        const cfg = parseConfig(t);
        if (!confirm(`'${cfg.site.title || f.name}' 설정을 불러와 적용할까요?`)) return;
        saveConfig(cfg, "file");
      }).catch((err) => { msg.className = "form-msg show no"; msg.textContent = "불러오지 못했습니다: " + err.message; });
      e.target.value = "";
    });
    $("#fiReset").addEventListener("click", () => {
      if (!confirm("이 브라우저의 수정본을 지우고 원래 config.js 로 돌아갈까요?")) return;
      try { localStorage.removeItem("rw_config_override"); localStorage.removeItem("rw_config_base"); } catch (e) {}
      ss.set("reopen", "file");
      location.reload();
    });
    $("#pwForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = $(".form-msg", e.target);
      const bad = (t) => { msg.className = "form-msg show no"; msg.textContent = t; };
      const A = C.admin || {};
      if (hashPw($("#pwNow").value, A.salt) !== A.passwordHash) return bad("현재 비밀번호가 맞지 않습니다.");
      const nw = $("#pwNew").value;
      if (nw.length < 8) return bad("새 비밀번호는 8자 이상으로 정해 주세요.");
      if (nw !== $("#pwNew2").value) return bad("새 비밀번호 확인이 일치하지 않습니다.");
      const salt = "rw-" + Math.random().toString(36).slice(2, 10);
      const cfg = JSON.parse(JSON.stringify(window.SITE_CONFIG));
      cfg.admin = { salt, passwordHash: hashPw(nw, salt) };
      try {
        localStorage.setItem("rw_config_override", JSON.stringify(cfg));
        localStorage.setItem("rw_config_base", JSON.stringify(window.SITE_CONFIG_ORIGINAL));
      } catch (er) { return bad("이 브라우저에 저장할 수 없습니다."); }
      window.SITE_CONFIG.admin = cfg.admin;
      window.SITE_CONFIG_OVERRIDDEN = true;
      e.target.reset();
      msg.className = "form-msg show ok";
      msg.innerHTML = `비밀번호를 바꿨습니다. <b>config.js 를 내려받아</b> 사이트 파일을 바꿔야 모든 곳에 적용됩니다.` +
        (LIVE ? `<br>운영 모드에서는 서버도 config.js 의 비밀번호로 확인하므로, 내려받은 config.js 를 사이트에 반영해야 새 비밀번호로 로그인할 수 있습니다.` : "");
    });
  };

  /* ---------- 시작 ---------- */
  btn.addEventListener("click", () => (adminToken ? openPanel() : openLogin()));
  // 관리자 로그인 직후 주차별 학습 내용을 받느라 새로고침된 경우: 관리자 화면을 다시 열어 줌
  if (ss.get("reopen_quiet") && adminToken) { ss.del("reopen_quiet"); openPanel(); }
  const reopen = ss.get("reopen");
  if (reopen && adminToken) {
    ss.del("reopen");
    openPanel(reopen);
    toast("저장했습니다. 수정한 내용이 이 브라우저에 적용되었습니다.");
  }
  // 새로고침 전에 관리자 화면이 열려 있었으면 같은 탭으로 다시 열기
  const lastPanel = ss.get("panel");
  if (lastPanel && adminToken && !panel) openPanel(lastPanel);
})();
