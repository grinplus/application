/* =========================================================
   수강생 참여 기능 — 실시간 투표 · 수강 신청서 · 로그인/출석/과제 제출 · 안내 팝업
   내용은 config.js 에서 읽어옵니다. (보통은 이 파일을 고칠 필요가 없습니다)

   데이터 저장
   - config.js 의 backend.url 이 비어 있으면 '체험 모드' : 이 브라우저(localStorage)에만 저장
   - backend.url 이 있으면 구글 Apps Script(시트·드라이브)로 저장 → 모든 수강생이 공유
   ========================================================= */
(function () {
  const X = window.SITE;
  if (!X) return;
  const { C, esc, $, $$, keyOf, fmtDate, fmtDateTime, today, weeks, remain, pad } = X;
  const LIVE = !!(C.backend && C.backend.url);

  /* ---------- 브라우저 저장소 (사용 불가 시 메모리로 대체) ---------- */
  const mem = {};
  const store = {
    get(k, d) {
      try { const v = localStorage.getItem("rw_" + k); return v == null ? d : JSON.parse(v); }
      catch (e) { return k in mem ? mem[k] : d; }
    },
    set(k, v) {
      mem[k] = v;
      try { localStorage.setItem("rw_" + k, JSON.stringify(v)); } catch (e) { /* 메모리에만 보관 */ }
    },
    del(k) { delete mem[k]; try { localStorage.removeItem("rw_" + k); } catch (e) {} }
  };
  const browserId = store.get("bid") || (() => {
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    store.set("bid", id);
    return id;
  })();
  let session = store.get("session", null);   // { sid, name, token }

  /* ---------- 데이터 통신 ---------- */
  const local = {
    getVotes({ voterId, pid, n }) {
      const v = store.get("votes_" + pid, {});
      const counts = Array.from({ length: n || C.vote.options.length }, () => 0);
      Object.values(v).forEach((i) => { if (counts[i] != null) counts[i]++; });
      const hidden = store.get("pollHistory", []).some((h) => h.pid === pid);
      return { ok: true, counts, mine: voterId in v ? v[voterId] : null, hidden };
    },
    vote({ voterId, option, pid, n }) {
      if (store.get("pollHistory", []).some((h) => h.pid === pid)) throw new Error("This poll is closed.");
      const v = store.get("votes_" + pid, {});
      v[voterId] = option;
      store.set("votes_" + pid, v);
      return local.getVotes({ voterId, pid, n });
    },
    apply({ data }) {
      const list = store.get("applications", []);
      if (list.some((a) => a.sid && a.sid === data.sid)) throw new Error("An application has already been submitted with this student ID.");
      list.push(Object.assign({ at: new Date().toISOString() }, data));
      store.set("applications", list);
      // 신청하면 명단에 '승인 대기'로 자동 등록
      const roster = store.get("roster", []);
      if (data.sid && !roster.some((r) => String(r.sid) === String(data.sid))) {
        roster.push({ sid: String(data.sid), name: data.name || "", pin: /^\d{4}$/.test(data.pin || "") ? data.pin : String(1000 + Math.floor(Math.random() * 9000)), status: "pending", createdAt: new Date().toISOString() });
        store.set("roster", roster);
      }
      return { ok: true };
    },
    login({ sid, name, pin }) {
      // 관리자가 명단을 등록했다면 명단과 대조, 없으면 체험용으로 누구나 로그인
      const roster = store.get("roster", []);
      if (roster.length) {
        const r = roster.find((x) => String(x.sid).trim() === String(sid).trim());
        if (!r || String(r.name).trim() !== String(name).trim() || String(r.pin).trim() !== String(pin).trim()) {
          throw new Error("Your student ID, name, or PIN is incorrect.");
        }
        if ((r.status || "approved") !== "approved") throw new Error("Your enrollment is waiting for instructor approval. You can log in once it is approved.");
      }
      const names = store.get("names", {});
      names[sid] = name;
      store.set("names", names);
      return { ok: true, token: "demo", sid, name };
    },
    getNotices() {
      return { ok: true, notices: store.get("notices", (C.notices && C.notices.items) || []) };
    },
    /* ----- 관리자용 (체험 모드: 이 브라우저에 쌓인 데이터를 모아서 보여 줌) ----- */
    adminLogin() { return { ok: true, adminToken: "demo" }; },
    saveNotices({ notices }) { store.set("notices", notices); return { ok: true }; },
    saveRoster({ roster }) {
      const old = store.get("roster", []);
      store.set("roster", roster.map((r) => {
        const o = old.find((x) => String(x.sid) === String(r.sid)) || {};
        return Object.assign({ createdAt: o.createdAt || new Date().toISOString() }, r, { status: r.status || o.status || "approved" });
      }));
      return { ok: true };
    },
    addStudent({ sid, name, pin }) {
      const roster = store.get("roster", []);
      if (!/^\d+$/.test(String(sid || "")) || !name) throw new Error("학번(숫자)과 이름을 입력해 주세요.");
      if (roster.some((r) => String(r.sid) === String(sid))) throw new Error(`학번 ${sid} 은(는) 이미 명단에 있습니다.`);
      const p = /^\d{4}$/.test(pin || "") ? pin : String(1000 + Math.floor(Math.random() * 9000));
      roster.push({ sid: String(sid), name, pin: p, status: "approved", createdAt: new Date().toISOString() });
      store.set("roster", roster);
      return { ok: true, pin: p };
    },
    setStudentStatus({ sid, status }) {
      store.set("roster", store.get("roster", []).map((r) => (String(r.sid) === String(sid) ? Object.assign({}, r, { status: status === "approved" ? "approved" : "pending" }) : r)));
      return { ok: true };
    },
    setStudentPin({ sid, pin }) {
      if (!/^\d{4}$/.test(pin || "")) throw new Error("PIN 은 숫자 4자리로 입력해 주세요.");
      store.set("roster", store.get("roster", []).map((r) => (String(r.sid) === String(sid) ? Object.assign({}, r, { pin }) : r)));
      return { ok: true, pin };
    },
    deleteStudent({ sid }) {
      store.set("roster", store.get("roster", []).filter((r) => String(r.sid) !== String(sid)));
      return { ok: true };
    },
    hidePoll({ poll }) {
      const list = store.get("pollHistory", []);
      if (!list.some((h) => h.pid === poll.pid)) {
        const { counts } = local.getVotes({ voterId: "", pid: poll.pid, n: poll.options.length });
        list.push({ pid: poll.pid, title: poll.title, options: poll.options, counts, hiddenAt: new Date().toISOString() });
        store.set("pollHistory", list);
      }
      return { ok: true };
    },
    showPoll({ pid }) {
      store.set("pollHistory", store.get("pollHistory", []).filter((h) => h.pid !== pid));
      return { ok: true };
    },
    pollHistory() { return { ok: true, history: store.get("pollHistory", []) }; },
    getEvents() { return { ok: true, events: store.get("calEvents", []) }; },
    saveEvents({ events }) { store.set("calEvents", events); return { ok: true }; },
    adminData() {
      const keys = [];
      try { for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i)); } catch (e) {}
      const names = store.get("names", {});
      const roster = store.get("roster", []);
      roster.forEach((r) => { if (!names[r.sid]) names[r.sid] = r.name; });
      const attendance = [], submissions = [];
      keys.forEach((k) => {
        if (k.startsWith("rw_att_")) {
          const sid = k.slice(7);
          Object.entries(store.get("att_" + sid, {})).forEach(([week, at]) => attendance.push({ sid, name: names[sid] || "", week: Number(week), at }));
        }
        if (k.startsWith("rw_subs_")) {
          const sid = k.slice(8);
          store.get("subs_" + sid, []).forEach((s) => submissions.push(Object.assign({ sid, name: names[sid] || "" }, s)));
        }
      });
      return { ok: true, roster, applications: store.get("applications", []), attendance, submissions };
    },
    status({ sid }) {
      return { ok: true, attendance: store.get("att_" + sid, {}), submissions: store.get("subs_" + sid, []) };
    },
    attend({ sid, week, date }) {
      if (date !== keyOf(today())) throw new Error("Today is not the class day for this week.");
      const att = store.get("att_" + sid, {});
      if (att[week]) throw new Error("You have already checked in.");
      att[week] = new Date().toISOString();
      store.set("att_" + sid, att);
      return { ok: true, at: att[week] };
    },
    submit({ sid, week, fileName, size, late }) {
      const subs = store.get("subs_" + sid, []);
      subs.push({ week, fileName, size, late, at: new Date().toISOString() });
      store.set("subs_" + sid, subs);
      return { ok: true };
    }
  };

  const api = (action, data) => {
    if (!LIVE) return Promise.resolve().then(() => local[action](data || {}));
    return fetch(C.backend.url, {
      method: "POST",                                   // text/plain 로 보내 CORS 사전요청을 피함
      body: JSON.stringify(Object.assign({ action }, data))
    })
      .then((r) => r.json())
      .catch(() => { throw new Error("Could not connect to the server. Please try again in a moment."); })
      .then((j) => { if (!j.ok) throw new Error(j.error || "Your request could not be processed."); return j; });
  };

  // 관리자 화면(admin.js)에서 함께 쓰기
  Object.assign(X, { api, store, LIVE });

  /* ---------- 주차별 학습 내용 열람 권한 (운영 모드) ----------
     서버의 config.js 에는 학습 내용이 빠져 있음(locked). 승인된 수강생이나 관리자면
     전체 내용을 받아 이 탭에 두고 새로고침, 로그아웃·잠금하면 지우고 새로고침 */
  const ssGet = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const ssSet = (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} };
  const weeksLocked = () => !!(C.curriculum && (C.curriculum.weeks || []).some((w) => w.locked));
  let accessBusy = false;
  function syncWeekAccess() {
    if (!LIVE || !C.curriculum || accessBusy) return;
    const has = !!ssGet("rw_full_weeks");
    const can = !!(session || X.adminToken);
    if (has && !can) { ssSet("rw_full_weeks", null); accessBusy = true; location.reload(); return; }
    if (!has && can && weeksLocked()) {
      accessBusy = true;
      const req = X.adminToken ? { adminToken: X.adminToken } : { sid: session.sid, token: session.token };
      api("getWeeks", req)
        .then((r) => {
          if (!Array.isArray(r.weeks)) return;
          ssSet("rw_full_weeks", JSON.stringify(r.weeks));
          if (X.adminToken && document.querySelector(".admin.show")) ssSet("rw_reopen_quiet", "1");
          location.reload();
        })
        .catch(() => { accessBusy = false; });   // 승인 대기 등: 잠긴 채로 둠
    }
  }
  X.syncWeekAccess = syncWeekAccess;
  document.addEventListener("rw-admin", syncWeekAccess);

  const modeNote = LIVE ? "" :
    `<p class="mode-note"><b>Demo mode</b> — data is saved only in this browser.</p>`;
  const body = (key) => {
    const sec = $(`[data-feature="${key}"]`);
    return sec ? $(".feature-body", sec) : null;
  };
  const fmtSize = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + "MB" : Math.max(1, Math.round(b / 1024)) + "KB");
  const hhmm = (iso) => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const setMsg = (el, type, text) => { el.className = "form-msg show " + type; el.textContent = text; };

  /* =========================================================
     0. 공지사항
     ========================================================= */
  const noticeBox = body("notices");
  const drawNotices = (list) => {
    const items = (list || []).slice().sort((a, b) => (b.important - a.important) || String(b.date).localeCompare(String(a.date)));
    if (noticeBox) {
      noticeBox.innerHTML = items.length ? `
        <div class="notice-list">
          ${items.map((n) => `
            <details class="card notice ${n.important ? "important" : ""}">
              <summary>
                ${n.important ? `<span class="chip hw urgent">Important</span>` : `<span class="chip off">Notice</span>`}
                <strong>${esc(n.title)}</strong>
                <span class="notice-date">${esc(n.date || "")}</span>
              </summary>
              <div class="notice-body">${esc(n.body || "").replace(/\n/g, "<br>")}</div>
            </details>`).join("")}
        </div>` : `<p class="muted">No notices yet.</p>`;
      const first = $(".notice", noticeBox);
      if (first) first.open = true;
    }
    // 중요 공지는 첫 화면 위쪽에 띠로 표시
    const old = $("#noticeBar");
    if (old) old.remove();
    const imp = items.find((n) => n.important);
    if (imp) {
      const bar = document.createElement("a");
      bar.id = "noticeBar";
      bar.className = "notice-bar";
      bar.href = "#notices";
      bar.innerHTML = `<b>Important</b> <span>${esc(imp.title)}</span>`;
      ($(".hero-main") || $(".hero-content")).prepend(bar);
    }
  };
  X.refreshNotices = () => api("getNotices").then((r) => drawNotices(r.notices)).catch(() => drawNotices((C.notices && C.notices.items) || []));
  if (C.notices) X.refreshNotices();

  /* =========================================================
     1. 실시간 주제 투표
     ========================================================= */
  const voteBox = body("vote");
  let refreshVotes = () => {};
  if (voteBox && C.vote) {
    const V = C.vote;
    // 설문 ID: 제목+보기로 만듦 → config.js 에서 새 설문으로 바꾸면 새 ID (투표·숨김 상태가 따로 관리됨)
    const pid = (() => {
      const s = [V.title].concat(V.options).join("\n");
      let h = 5381;
      for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
      return "p" + (h >>> 0).toString(36);
    })();
    if (!LIVE && store.get("votes", null)) {           // 예전 형식(설문 구분 없음) 투표 기록 옮기기
      if (!store.get("votes_" + pid, null)) store.set("votes_" + pid, store.get("votes"));
      store.del("votes");
    }
    voteBox.innerHTML = `
      ${modeNote}
      <div class="card poll-admin" id="pollAdmin" hidden></div>
      <div class="card poll-closed" id="pollClosed" hidden>숨긴 설문입니다. 수강생 화면에는 이 섹션이 보이지 않습니다.</div>
      <div class="vote-layout">
        <form class="card vote-card" id="voteForm" novalidate>
          <h3>Choose a topic</h3>
          <div class="vote-opts">
            ${V.options.map((o, i) => `
              <label class="option vote-opt">
                <input type="radio" name="voteOpt" value="${i}">
                <span>${esc(o)}</span>
              </label>`).join("")}
          </div>
          <button class="btn" type="submit">Vote</button>
          <div class="form-msg" role="status"></div>
        </form>
        <div class="card result-card">
          <div class="result-head">
            <h3>Results</h3>
            <span class="live"><i></i>${LIVE ? "Live" : "This browser"}</span>
          </div>
          <div class="bars" id="voteBars"></div>
          <div class="result-foot"><b id="voteTotal">0</b> votes <span id="voteUpdated"></span></div>
        </div>
      </div>
      <div class="poll-history" id="pollHistory" hidden></div>`;

    const voterId = () => (session ? "sid:" + session.sid : "bid:" + browserId);
    const form = $("#voteForm");
    const msg = $(".form-msg", form);
    const voteSec = voteBox.closest("section");
    const isAdmin = () => !!X.adminToken;              // admin.js 가 관리자 로그인 상태를 알려 줌
    let pollHidden = null;

    // 숨긴 설문: 수강생에게는 섹션과 메뉴를 감추고, 관리자에게는 안내와 함께 보여 줌
    const applyVisibility = () => {
      const hideAll = !!pollHidden && !isAdmin();
      voteSec.hidden = hideAll;
      $$(`.nav a[data-id="${voteSec.id}"], nav a[data-id="${voteSec.id}"]`).forEach((a) => { a.hidden = hideAll; });
      $(".vote-layout", voteBox).hidden = !!pollHidden;
      $("#pollClosed").hidden = !pollHidden;
    };

    const ymdhm = (iso) => { const d = new Date(iso); return isNaN(d) ? String(iso || "") : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
    const drawHistory = (list) => {
      const box = $("#pollHistory");
      const rows = (list || []).slice().sort((a, b) => String(b.hiddenAt).localeCompare(String(a.hiddenAt)));
      box.innerHTML = `
        <div class="poll-history-head">
          <h3>설문 히스토리 <small>${rows.length}개</small></h3>
          <span class="chip hw open">관리자에게만 보임</span>
        </div>
        ${rows.length ? `<div class="table-wrap"><table class="a-table">
          <thead><tr><th>숨긴 시각</th><th>설문</th><th>결과</th><th>참여</th><th><span class="sr-only">관리</span></th></tr></thead>
          <tbody>${rows.map((h) => {
            const counts = h.counts || [];
            const total = counts.reduce((a, b) => a + (Number(b) || 0), 0);
            const max = Math.max(0, ...counts);
            return `<tr>
              <td>${esc(ymdhm(h.hiddenAt))}</td>
              <td class="wrap"><b>${esc(h.title)}</b>${h.pid === pid ? ` <span class="chip now">현재 설문</span>` : ""}</td>
              <td class="wrap long"><ul class="ph-results">${(h.options || []).map((o, i) => {
                const n = Number(counts[i]) || 0;
                return `<li class="${n && n === max ? "lead" : ""}"><span>${esc(o)}</span><span>${n}표 · ${total ? Math.round((n / total) * 100) : 0}%</span></li>`;
              }).join("")}</ul></td>
              <td>${total}명</td>
              <td>${h.pid === pid ? `<button class="btn ghost small" type="button" data-poll="show">다시 보이기</button>` : ""}</td>
            </tr>`;
          }).join("")}</tbody>
        </table></div>` : `<p class="muted">아직 숨긴 설문이 없습니다.</p>`}`;
      box.hidden = false;
    };

    const drawAdmin = () => {
      const bar = $("#pollAdmin"), hist = $("#pollHistory");
      if (!isAdmin()) { bar.hidden = true; hist.hidden = true; hist.innerHTML = ""; return; }
      bar.hidden = false;
      bar.innerHTML = `
        <span class="chip ${pollHidden ? "off" : "now"}">${pollHidden ? "숨김" : "공개 중"}</span>
        <span class="poll-admin-text"><b>관리자</b> · ${pollHidden ? "이 설문은 수강생에게 보이지 않습니다." : "수강생에게 공개 중인 설문입니다."}</span>
        <button class="btn small ${pollHidden ? "" : "ghost"}" type="button" data-poll="${pollHidden ? "show" : "hide"}">${pollHidden ? "다시 보이기" : "설문 숨기기"}</button>
        <div class="form-msg" role="status"></div>`;
      api("pollHistory", { adminToken: X.adminToken })
        .then((r) => drawHistory(r.history))
        .catch((e) => setMsg($(".form-msg", bar), "no", e.message));
    };

    voteBox.addEventListener("click", (e) => {
      const b = e.target.closest("[data-poll]");
      if (!b || !isAdmin()) return;
      const hide = b.dataset.poll === "hide";
      if (hide && !confirm("이 설문을 숨길까요?\n수강생 화면에서 사라지고, 지금까지의 결과는 설문 히스토리에 저장됩니다.")) return;
      b.disabled = true;
      api(hide ? "hidePoll" : "showPoll", hide
        ? { adminToken: X.adminToken, poll: { pid, title: V.title, options: V.options } }
        : { adminToken: X.adminToken, pid })
        .then(() => refreshVotes())
        .then(() => drawAdmin())
        .catch((err) => { b.disabled = false; setMsg($(".form-msg", $("#pollAdmin")), "no", err.message); });
    });
    document.addEventListener("rw-admin", () => { if (pollHidden !== null) applyVisibility(); drawAdmin(); });

    const draw = (res) => {
      const changed = pollHidden !== !!res.hidden;
      pollHidden = !!res.hidden;
      applyVisibility();
      if (changed) drawAdmin();
      const total = res.counts.reduce((a, b) => a + b, 0);
      const max = Math.max(...res.counts);
      $("#voteBars").innerHTML = V.options.map((o, i) => {
        const n = res.counts[i] || 0;
        const pct = total ? Math.round((n / total) * 100) : 0;
        const cls = [n && n === max ? "lead" : "", res.mine === i ? "mine" : ""].join(" ");
        return `
          <div class="bar-row ${cls}">
            <div class="bar-label"><span>${esc(o)}${res.mine === i ? ' <b class="chip now">My vote</b>' : ""}</span><span class="bar-val">${n} · ${pct}%</span></div>
            <div class="bar-track" role="img" aria-label="${esc(o)} ${n} votes ${pct}%"><div class="bar-fill" style="width:${pct}%"></div></div>
          </div>`;
      }).join("");
      $("#voteTotal").textContent = total;
      const now = new Date();
      $("#voteUpdated").textContent = `· ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} updated`;
      if (res.mine != null) {
        const r = $(`input[value="${res.mine}"]`, form);
        if (r && !form.dataset.touched) r.checked = true;
        $("button", form).textContent = "Change vote";
      } else {
        $("button", form).textContent = "Vote";
      }
    };

    refreshVotes = () => api("getVotes", { voterId: voterId(), pid, n: V.options.length }).then(draw).catch((e) => setMsg(msg, "no", e.message));
    form.addEventListener("change", () => { form.dataset.touched = "1"; });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const picked = $("input:checked", form);
      if (!picked) return setMsg(msg, "no", "Please choose a topic.");
      const btn = $("button", form);
      btn.disabled = true;
      api("vote", { voterId: voterId(), option: Number(picked.value), pid, n: V.options.length })
        .then((res) => { delete form.dataset.touched; draw(res); setMsg(msg, "ok", "Your vote has been counted. Thank you!"); })
        .catch((err) => setMsg(msg, "no", err.message))
        .finally(() => { btn.disabled = false; });
    });

    refreshVotes();
    if (LIVE) {
      setInterval(() => { if (!document.hidden) refreshVotes(); }, Math.max(5, V.refreshSeconds || 10) * 1000);
    } else {
      // 체험 모드: 같은 브라우저의 다른 탭에서 투표하면 바로 반영
      window.addEventListener("storage", (e) => {
        if (e.key === "rw_votes_" + pid) refreshVotes();
        if (e.key === "rw_pollHistory") refreshVotes().then(() => { if (isAdmin()) drawAdmin(); });
      });
    }
  }

  /* =========================================================
     2. 수강 신청서 (빠진 항목 안내)
     ========================================================= */
  const applyBox = body("apply");
  if (applyBox && C.apply) {
    const A = C.apply;
    const control = (f) => {
      const id = "ap-" + f.name;
      const req = f.required ? "required" : "";
      const ph = f.placeholder ? `placeholder="${esc(f.placeholder)}"` : "";
      if (f.type === "textarea") return `<textarea id="${id}" name="${esc(f.name)}" rows="4" ${ph} ${req}></textarea>`;
      if (f.type === "select") return `<select id="${id}" name="${esc(f.name)}" ${req}><option value="">Select</option>${f.options.map((o) => `<option>${esc(o)}</option>`).join("")}</select>`;
      if (f.type === "radio") return `<div class="radio-row" role="radiogroup" id="${id}" aria-labelledby="${id}-l">${f.options.map((o) => `<label class="pill"><input type="radio" name="${esc(f.name)}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join("")}</div>`;
      // 로그인용 PIN: 숫자 4자리를 학생이 직접 정함
      if (f.type === "pin") return `<input id="${id}" name="${esc(f.name)}" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" ${ph} ${req}>`;
      const type = ["email", "tel"].includes(f.type) ? f.type : "text";
      return `<input id="${id}" name="${esc(f.name)}" type="${type}" ${ph} ${req} autocomplete="${f.type === "email" ? "email" : f.type === "tel" ? "tel" : "off"}">`;
    };

    const drawForm = () => {
      applyBox.innerHTML = `
        ${modeNote}
        <form class="card apply-form" id="applyForm" novalidate>
          <div class="form-alert" id="applyAlert" role="alert" tabindex="-1" hidden></div>
          <div class="form-grid">
            ${A.fields.map((f) => `
              <div class="field ${f.type === "textarea" || f.type === "radio" ? "wide" : ""}" data-name="${esc(f.name)}">
                <label id="ap-${esc(f.name)}-l" for="ap-${esc(f.name)}">${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ' <span class="opt">(optional)</span>'}</label>
                ${control(f)}
                <div class="field-error" id="ap-${esc(f.name)}-err"></div>
              </div>`).join("")}
            ${A.consent ? `
              <div class="field wide" data-name="consent">
                <label class="consent"><input type="checkbox" name="consent" id="ap-consent"> <span>${esc(A.consent)} <span class="req">*</span></span></label>
                <div class="field-error" id="ap-consent-err"></div>
              </div>` : ""}
          </div>
          <div class="form-actions">
            <button class="btn btn-lg" type="submit">Submit application</button>
            <button class="btn ghost" type="reset">Clear</button>
          </div>
        </form>`;
      bindForm();
    };

    const valueOf = (form, name) => {
      const els = form.elements[name];
      if (!els) return "";
      if (els instanceof RadioNodeList) { const c = [...els].find((r) => r.checked); return c ? c.value : ""; }
      if (els.type === "checkbox") return els.checked;
      return els.value.trim();
    };

    const checkField = (form, f) => {
      const v = valueOf(form, f.name);
      if (f.required && !v) return `Please ${f.type === "select" || f.type === "radio" ? "choose" : "enter"} ${f.label.toLowerCase()}.`;
      if (v && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Please enter a valid email address (e.g., name@university.ac.kr).";
      if (v && f.pattern && !new RegExp(f.pattern).test(v)) return f.patternMessage || `Please check the format of ${f.label.toLowerCase()}.`;
      return "";
    };
    const allChecks = () => A.fields.concat(A.consent ? [{ name: "consent", label: "Consent", required: true, type: "checkbox" }] : []);
    const showError = (form, f, text) => {
      const wrap = $(`.field[data-name="${f.name}"]`, form);
      wrap.classList.toggle("invalid", !!text);
      $(".field-error", wrap).textContent = text;
      const ctl = form.elements[f.name];
      if (ctl && !(ctl instanceof RadioNodeList)) ctl.setAttribute("aria-invalid", text ? "true" : "false");
    };

    const bindForm = () => {
      const form = $("#applyForm");
      const alertBox = $("#applyAlert");

      // 고치는 즉시 오류 표시를 지움
      form.addEventListener("input", (e) => {
        const f = allChecks().find((x) => x.name === e.target.name);
        if (f && $(`.field[data-name="${f.name}"]`, form).classList.contains("invalid")) showError(form, f, checkField(form, f));
      });
      form.addEventListener("change", (e) => {
        const f = allChecks().find((x) => x.name === e.target.name);
        if (f && $(`.field[data-name="${f.name}"]`, form).classList.contains("invalid")) showError(form, f, checkField(form, f));
      });
      form.addEventListener("reset", () => {
        alertBox.hidden = true;
        allChecks().forEach((f) => showError(form, f, ""));
      });
      alertBox.addEventListener("click", (e) => {
        const a = e.target.closest("[data-focus]");
        if (!a) return;
        e.preventDefault();
        const el = $(`#ap-${a.dataset.focus}`) ;
        const target = el && el.matches(".radio-row") ? $("input", el) : el;
        if (target) target.focus();
      });

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const problems = [];
        allChecks().forEach((f) => {
          const err = checkField(form, f);
          showError(form, f, err);
          if (err) problems.push({ f, err, missing: !valueOf(form, f.name) });
        });
        if (problems.length) {
          const missing = problems.filter((p) => p.missing);
          const wrong = problems.filter((p) => !p.missing);
          alertBox.innerHTML = `
            <strong>⚠ ${problems.length} field${problems.length > 1 ? "s need" : " needs"} your attention.</strong>
            ${missing.length ? `<div>Missing: ${missing.map((p) => `<a href="#" data-focus="${esc(p.f.name)}">${esc(p.f.label)}</a>`).join(", ")}</div>` : ""}
            ${wrong.length ? `<div>Check format: ${wrong.map((p) => `<a href="#" data-focus="${esc(p.f.name)}">${esc(p.f.label)}</a>`).join(", ")}</div>` : ""}`;
          alertBox.hidden = false;
          alertBox.focus();
          alertBox.scrollIntoView({ behavior: X.reduceMotion ? "auto" : "smooth", block: "center" });
          return;
        }
        alertBox.hidden = true;
        const data = {};
        A.fields.forEach((f) => (data[f.name] = valueOf(form, f.name)));
        const btn = $("button[type=submit]", form);
        btn.disabled = true;
        btn.textContent = "Submitting…";
        api("apply", { data })
          .then(() => {
            store.set("applied", true);
            applyBox.innerHTML = `
              ${modeNote}
              <div class="card success-card" tabindex="-1" id="applyDone">
                <div class="success-icon">✓</div>
                <h3>Thank you, ${esc(data.name)}. Your application has been submitted.</h3>
                <p>${esc(A.successMessage)}</p>
                <button class="btn ghost" type="button" id="applyAgain">Submit another application</button>
              </div>`;
            $("#applyDone").focus();
            $("#applyAgain").addEventListener("click", drawForm);
          })
          .catch((err) => {
            alertBox.innerHTML = `<strong>⚠ ${esc(err.message)}</strong>`;
            alertBox.hidden = false;
            alertBox.focus();
            btn.disabled = false;
            btn.textContent = "Submit application";
          });
      });
    };
    drawForm();
  }

  /* =========================================================
     3. 수강생 공간: 로그인 · 출석 체크 · 과제 제출
     ========================================================= */
  const stuBox = body("student");
  let pendingWeek = null;                        // '과제 제출하기' 버튼으로 들어온 주차
  const hwWeeks = weeks.filter((w) => w.assignment);
  const todayWeek = () => weeks.find((w) => keyOf(w.date) === keyOf(today())) || null;

  const drawLogin = (notice) => {
    stuBox.innerHTML = `
      ${modeNote}
      <form class="card login-card" id="loginForm" novalidate>
        <div class="login-icon" aria-hidden="true"></div>
        <h3>Student login</h3>
        ${notice ? `<p class="login-notice">${esc(notice)}</p>` : ""}
        <div class="field"><label for="lg-sid">Student ID</label><input id="lg-sid" name="sid" inputmode="numeric" autocomplete="username" placeholder="2026123456"><div class="field-error"></div></div>
        <div class="field"><label for="lg-name">Name</label><input id="lg-name" name="name" autocomplete="name" placeholder="Jane Kim"><div class="field-error"></div></div>
        <div class="field"><label for="lg-pin">${esc(C.student.pinLabel || "PIN")}</label><input id="lg-pin" name="pin" type="password" inputmode="numeric" autocomplete="current-password"><div class="field-error"></div></div>
        <button class="btn btn-lg" type="submit">Log in</button>
        <div class="form-msg" role="status"></div>
      </form>`;
    const form = $("#loginForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const labels = { sid: "your student ID", name: "your name", pin: "your PIN" };
      let first = null;
      Object.keys(labels).forEach((n) => {
        const el = form.elements[n];
        const empty = !el.value.trim();
        el.closest(".field").classList.toggle("invalid", empty);
        $(".field-error", el.closest(".field")).textContent = empty ? `Please enter ${labels[n]}.` : "";
        if (empty && !first) first = el;
      });
      if (first) return first.focus();
      const btn = $("button", form);
      btn.disabled = true;
      api("login", { sid: form.elements.sid.value.trim(), name: form.elements.name.value.trim(), pin: form.elements.pin.value.trim() })
        .then((res) => {
          session = { sid: res.sid, name: res.name, token: res.token };
          store.set("session", session);
          drawDashboard();
          refreshVotes();
          syncWeekAccess();              // 승인된 수강생: 주차별 학습 내용 열기
        })
        .catch((err) => { setMsg($(".form-msg", form), "no", err.message); btn.disabled = false; });
    });
  };

  const drawDashboard = () => {
    const S = C.student;
    stuBox.innerHTML = `
      ${modeNote}
      <div class="card student-bar">
        <span class="avatar-s">${esc(session.name.charAt(0))}</span>
        <span class="who"><b>${esc(session.name)}</b> <span class="muted-inline">· ${esc(session.sid)}</span></span>
        <button class="btn ghost small" type="button" id="logoutBtn">Log out</button>
      </div>
      <div class="student-grid">
        <div class="card att-card">
          <h3>Attendance</h3>
          <div class="att-today" id="attToday">Loading…</div>
          <div class="att-grid" id="attGrid"></div>
          <div class="att-summary" id="attSummary"></div>
        </div>
        <div class="card sub-card">
          <h3>Submit an assignment</h3>
          ${hwWeeks.length ? `
          <form id="subForm" novalidate>
            <div class="field">
              <label for="subWeek">Assignment</label>
              <select id="subWeek">
                ${hwWeeks.map((w) => {
                  const r = remain(w.due);
                  const closed = r.cls === "closed" && !S.allowLate;
                  return `<option value="${w.no}" ${closed ? "disabled" : ""}>Week ${w.no} · ${esc(w.assignment.title)} (${esc(r.dday)})</option>`;
                }).join("")}
              </select>
            </div>
            <div class="sub-due" id="subDue"></div>
            <label class="drop" id="drop">
              <input type="file" id="subFile" accept="${esc(S.accept || "")}">
              <span class="drop-icon">⬆</span>
              <span class="drop-text"><b>Drag a file here or click to choose</b><small>Max ${S.maxFileMB}MB · ${esc((S.accept || "").replace(/\./g, "").replace(/,/g, ", "))}</small></span>
            </label>
            <div class="file-info" id="fileInfo" hidden></div>
            <button class="btn" type="submit">Submit</button>
            <div class="form-msg" role="status"></div>
          </form>
          <h4 class="sub-h">My submissions</h4>
          <ul class="sub-list" id="subList"><li class="muted">Loading…</li></ul>` : `<p class="muted">No assignments yet.</p>`}
        </div>
      </div>`;

    $("#logoutBtn").addEventListener("click", () => {
      store.del("session");
      session = null;
      drawLogin();
      refreshVotes();
      syncWeekAccess();                  // 학습 내용 다시 잠그기
    });

    let status = { attendance: {}, submissions: [] };
    const drawAttendance = () => {
      const att = status.attendance || {};
      const tw = todayWeek();
      const t0 = today();
      $("#attGrid").innerHTML = weeks.map((w) => {
        const k = keyOf(w.date);
        const st = att[w.no] ? "ok" : k === keyOf(t0) ? "today" : w.date < t0 ? "miss" : "future";
        const label = { ok: "Present", today: "Today", miss: "Absent", future: "Upcoming" }[st];
        return `<div class="att-cell ${st}" title="Week ${w.no} · ${esc(fmtDate(w.date))} · ${label}">
                  <b>W${w.no}</b><span>${w.date.getMonth() + 1}/${w.date.getDate()}</span><i>${{ ok: "✓", today: "●", miss: "✕", future: "" }[st]}</i>
                </div>`;
      }).join("");
      const past = weeks.filter((w) => w.date <= t0).length;
      const okN = weeks.filter((w) => att[w.no]).length;
      $("#attSummary").innerHTML = `Present <b>${okN}</b> / ${past} past classes <span class="legend"><i class="lg att-ok"></i>Present <i class="lg att-miss"></i>Absent <i class="lg done"></i>Upcoming</span>`;

      const box = $("#attToday");
      if (tw && att[tw.no]) {
        box.innerHTML = `<div class="att-msg ok">✓ Checked in for Week ${tw.no} <small>${esc(hhmm(att[tw.no]))}</small></div>`;
      } else if (tw) {
        box.innerHTML = `
          <div class="att-msg now">Today is the <b>Week ${tw.no}</b> class · ${esc(tw.time)}</div>
          <button class="btn btn-lg att-btn" type="button" id="attBtn">Check in now</button>
          <div class="form-msg" role="status"></div>`;
        $("#attBtn").addEventListener("click", (e) => {
          e.target.disabled = true;
          api("attend", { sid: session.sid, token: session.token, week: tw.no, date: keyOf(tw.date) })
            .then((res) => { status.attendance[tw.no] = res.at || new Date().toISOString(); drawAttendance(); })
            .catch((err) => { setMsg($(".form-msg", box), "no", err.message); e.target.disabled = false; });
        });
      } else {
        const nw = weeks.find((w) => w.date > t0);
        box.innerHTML = `
          <div class="att-msg off">There is no class today.${nw ? `<br><small>Next class: Week ${nw.no} · ${esc(fmtDate(nw.date))} ${esc(nw.time)}</small>` : ""}</div>
          <button class="btn btn-lg att-btn" type="button" disabled>Check-in opens on class days</button>`;
      }
    };

    const drawSubs = () => {
      const list = $("#subList");
      if (!list) return;
      const subs = (status.submissions || []).slice().sort((a, b) => (a.at < b.at ? 1 : -1));
      list.innerHTML = subs.length ? subs.map((s) => {
        return `<li><span class="chip ${s.late ? "hw urgent" : "now"}">Week ${s.week}${s.late ? " · late" : ""}</span>
                  <span class="sub-file">${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.fileName)}</a>` : esc(s.fileName)}</span>
                  <small>${s.size ? esc(fmtSize(s.size)) + " · " : ""}${esc(hhmm(s.at))}</small></li>`;
      }).join("") : `<li class="muted">You have not submitted anything yet.</li>`;
    };

    // 과제 제출 폼
    const sf = $("#subForm");
    if (sf) {
      const sel = $("#subWeek"), fileIn = $("#subFile"), info = $("#fileInfo"), drop = $("#drop"), msg = $(".form-msg", sf);
      const firstOpen = hwWeeks.find((w) => !$(`option[value="${w.no}"]`, sel).disabled);
      const pick = pendingWeek && !$(`option[value="${pendingWeek}"]`, sel)?.disabled ? pendingWeek : firstOpen && firstOpen.no;
      if (pick) sel.value = String(pick);
      if (pendingWeek && String(pick) !== String(pendingWeek)) setMsg(msg, "no", `The Week ${pendingWeek} assignment is closed.`);
      pendingWeek = null;
      if (!firstOpen) { $("button", sf).disabled = true; setMsg(msg, "no", "There are no open assignments right now."); }

      const drawDue = () => {
        const w = weeks[Number(sel.value) - 1];
        if (!w) return;
        const r = remain(w.due);
        const done = (status.submissions || []).some((s) => s.week === w.no);
        $("#subDue").className = "sub-due " + r.cls;
        $("#subDue").innerHTML = `Due ${esc(fmtDateTime(w.due))} · <b>${esc(r.dday)} ${esc(r.text)}</b>${done ? `<br><small>You already submitted this. Submitting again will replace it with the newest file.</small>` : ""}`;
      };
      sel.addEventListener("change", drawDue);

      const exts = (C.student.accept || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      const checkFile = (f) => {
        if (!f) return "Please choose a file to submit.";
        const ext = "." + f.name.split(".").pop().toLowerCase();
        if (exts.length && !exts.includes(ext)) return `${ext} files are not accepted. (${exts.join(", ")})`;
        if (f.size > C.student.maxFileMB * 1048576) return `The file is too large. Please upload ${C.student.maxFileMB}MB or less. (Current: ${fmtSize(f.size)})`;
        return "";
      };
      const showFile = () => {
        const f = fileIn.files[0];
        if (!f) { info.hidden = true; return; }
        const err = checkFile(f);
        info.hidden = false;
        info.className = "file-info " + (err ? "bad" : "");
        info.innerHTML = `<b>${esc(f.name)}</b> <small>${esc(fmtSize(f.size))}</small>${err ? `<div>${esc(err)}</div>` : ""}`;
        msg.className = "form-msg";
      };
      fileIn.addEventListener("change", showFile);
      ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
      ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
      drop.addEventListener("drop", (e) => {
        if (e.dataTransfer.files.length) {
          const dt = new DataTransfer();
          dt.items.add(e.dataTransfer.files[0]);
          fileIn.files = dt.files;
          showFile();
        }
      });

      const toBase64 = (f) => new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1]);
        r.onerror = () => rej(new Error("Could not read the file."));
        r.readAsDataURL(f);
      });

      sf.addEventListener("submit", (e) => {
        e.preventDefault();
        const f = fileIn.files[0];
        const err = checkFile(f);
        if (err) { setMsg(msg, "no", err); fileIn.focus(); return; }
        const w = weeks[Number(sel.value) - 1];
        const late = remain(w.due).cls === "closed";
        if (late && !C.student.allowLate) return setMsg(msg, "no", "This assignment is closed.");
        const btn = $("button[type=submit]", sf);
        btn.disabled = true;
        btn.textContent = "Submitting…";
        (LIVE ? toBase64(f) : Promise.resolve(null))
          .then((data) => api("submit", {
            sid: session.sid, token: session.token, week: w.no, late,
            fileName: f.name, size: f.size, mimeType: f.type || "application/octet-stream", data
          }))
          .then(() => api("status", { sid: session.sid, token: session.token }))
          .then((res) => {
            status = res;
            drawSubs();
            drawDue();
            sf.reset();
            sel.value = String(w.no);
            info.hidden = true;
            setMsg(msg, "ok", `Submitted "${f.name}" for Week ${w.no}!${LIVE ? "" : " (Demo mode: only the file name is recorded.)"}`);
          })
          .catch((er) => setMsg(msg, "no", er.message))
          .finally(() => { btn.disabled = false; btn.textContent = "Submit"; });
      });
      sf._drawDue = drawDue;
    }

    api("status", { sid: session.sid, token: session.token })
      .then((res) => { status = res; drawAttendance(); drawSubs(); if (sf) sf._drawDue(); })
      .catch((err) => {
        $("#attToday").innerHTML = `<div class="att-msg off">${esc(err.message)}</div>`;
        if (/log ?in|token|approv/i.test(err.message)) { store.del("session"); session = null; drawLogin("Please log in again."); }
      });
  };

  if (stuBox && C.student) {
    session ? drawDashboard() : drawLogin();

    // 주차별 강의의 '과제 제출하기' → 해당 주차를 골라 둔 채로 이동
    document.addEventListener("click", (e) => {
      const a = e.target.closest("[data-submit-week]");
      if (!a) return;
      pendingWeek = Number(a.dataset.submitWeek);
      if (session) {
        const sel = $("#subWeek");
        const opt = sel && $(`option[value="${pendingWeek}"]`, sel);
        if (opt && !opt.disabled) { sel.value = String(pendingWeek); sel.dispatchEvent(new Event("change")); }
        pendingWeek = null;
      } else {
        drawLogin(`Log in to submit the Week ${pendingWeek} assignment.`);
      }
    });
  }

  /* =========================================================
     3-0. 주차별 강의 추가 · 수정 · 삭제 (관리자)
          운영 모드: 서버 DB 에 저장 → 모든 방문자에게 반영 / 체험 모드: 이 브라우저에만 저장
     ========================================================= */
  const curSec = C.curriculum ? $(`#${C.curriculum.id || "curriculum"}`) : null;
  if (curSec) {
    const rawWeeks = () => JSON.parse(JSON.stringify(C.curriculum.weeks || []));
    const syncWeekAdmin = () => $$(".admin-only", curSec).forEach((el) => { el.hidden = !X.adminToken; });
    document.addEventListener("rw-admin", syncWeekAdmin);
    syncWeekAdmin();

    // 저장 후 새로고침되면 그 주차를 펼쳐 보여 줌
    try {
      const back = sessionStorage.getItem("rw_week_saved");
      if (back) {
        sessionStorage.removeItem("rw_week_saved");
        const [no, text] = back.split("|");
        const d = $(`#week-${no}`);
        if (d) { d.open = true; setTimeout(() => d.scrollIntoView({ block: "start" }), 150); }
        const t = document.createElement("div");
        t.className = "toast show"; t.setAttribute("role", "status"); t.textContent = text;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3200);
      }
    } catch (e) {}

    const persistWeeks = (list, focusNo, text) =>
      (LIVE ? api("saveCurriculum", { adminToken: X.adminToken, weeks: list })
            : Promise.resolve().then(() => (list ? store.set("curriculum", list) : store.del("curriculum"))))
        .then(() => {
          try { sessionStorage.setItem("rw_week_saved", `${focusNo || ""}|${text}`); } catch (e) {}
          ssSet("rw_full_weeks", null);   // 새 내용으로 다시 받기
          location.reload();
        });

    const rowHtml = (kind, item) => `
      <div class="wf-row" data-row="${kind}">
        <input type="text" class="wf-t" placeholder="제목" value="${esc(item.title || "")}" aria-label="제목">
        <input type="url" class="wf-u" placeholder="${kind === "video" ? "https://www.youtube.com/watch?v=…" : "https://drive.google.com/…"}" value="${esc(item.url || "")}" aria-label="주소">
        <button type="button" class="icon-btn" data-row-del aria-label="이 줄 삭제">✕</button>
        <small class="wf-hint"></small>
      </div>`;
    const hintFor = (kind, url) => {
      if (!url) return "";
      if (kind === "video") return X.ytId(url) ? "✓ YouTube 영상 — 사이트에서 바로 재생됩니다" : "YouTube 주소가 아니라서 링크로만 보입니다";
      return X.driveEmbed(url) ? "✓ Google Drive 자료 — 미리보기가 가능합니다" : "미리보기 없이 링크로 보입니다 (공유 설정을 '링크가 있는 모든 사용자'로 해 주세요)";
    };

    const openWeekForm = (index) => {
      const list = rawWeeks();
      const isNew = index == null;
      const w = isNew ? { title: "", summary: "", contents: [], videos: [], materials: [] } : list[index];
      const as = w.assignment || null;
      const dueVal = as && as.due ? String(as.due).trim().replace(" ", "T").slice(0, 16) : "";
      const lastFocus = document.activeElement;
      const wrap = document.createElement("div");
      wrap.className = "modal-backdrop";
      wrap.innerHTML = `
        <form class="modal week-modal" role="dialog" aria-modal="true" aria-labelledby="wfTitle" novalidate>
          <button class="modal-x" type="button" aria-label="Close">×</button>
          <div class="modal-body">
            <h2 id="wfTitle">${isNew ? `${list.length + 1}주차 추가` : `${index + 1}주차 수정`}</h2>
            <div class="field"><label for="wfName">제목 <span class="req">*</span></label><input id="wfName" value="${esc(w.title || "")}"><div class="field-error"></div></div>
            <div class="field"><label for="wfSum">한 줄 요약 <span class="opt">(선택)</span></label><input id="wfSum" value="${esc(w.summary || "")}"></div>
            <div class="field"><label for="wfDate">수업 날짜 <span class="opt">(비우면 매주 자동 계산)</span></label><input id="wfDate" type="date" value="${esc(w.date ? String(w.date).slice(0, 10) : "")}"></div>
            <div class="field"><label for="wfContents">학습 내용 <span class="opt">(한 줄에 하나씩)</span></label><textarea id="wfContents" rows="4">${esc((w.contents || []).join("\n"))}</textarea></div>

            <fieldset class="wf-set" data-set="video">
              <legend>참고 영상 <span class="opt">YouTube 주소를 넣으면 사이트 안에서 재생됩니다</span></legend>
              <div class="wf-rows">${(w.videos || []).map((v) => rowHtml("video", v)).join("")}</div>
              <button type="button" class="btn ghost small" data-row-add="video">+ 영상 추가</button>
            </fieldset>

            <fieldset class="wf-set" data-set="material">
              <legend>Google Drive 자료 첨부 <span class="opt">Drive 파일 · 폴더 · Docs · Slides · Sheets</span></legend>
              <div class="wf-attach">
                <input type="url" id="wfDrive" placeholder="Google Drive 공유 링크를 붙여 넣으세요" aria-label="Google Drive 공유 링크">
                <button type="button" class="btn small" id="wfDriveAdd">첨부</button>
              </div>
              <small class="wf-attach-msg" id="wfDriveMsg" role="status"></small>
              <div class="wf-rows">${(w.materials || []).map((m) => rowHtml("material", m)).join("")}</div>
              <button type="button" class="btn ghost small" data-row-add="material">+ 다른 링크 직접 추가</button>
              <p class="wf-help">학생이 볼 수 있도록 드라이브에서 <b>공유 → 일반 액세스: '링크가 있는 모든 사용자' · 뷰어</b>로 설정해 주세요. 첨부한 자료는 주차를 펼치면 '미리보기'로 바로 볼 수 있습니다.</p>
            </fieldset>

            <fieldset class="wf-set">
              <legend><label class="wf-check"><input type="checkbox" id="wfHasAs" ${as ? "checked" : ""}> 이 주차에 과제 있음</label></legend>
              <div class="wf-as" ${as ? "" : "hidden"}>
                <div class="field"><label for="wfAsTitle">과제 제목 <span class="req">*</span></label><input id="wfAsTitle" value="${esc(as ? as.title : "")}"><div class="field-error"></div></div>
                <div class="field"><label for="wfAsDesc">설명</label><textarea id="wfAsDesc" rows="3">${esc(as ? as.desc || "" : "")}</textarea></div>
                <div class="field"><label for="wfAsDue">마감 <span class="req">*</span></label><input id="wfAsDue" type="datetime-local" value="${esc(dueVal)}"><div class="field-error"></div></div>
              </div>
            </fieldset>

            <div class="form-msg" role="alert"></div>
            <div class="form-actions">
              <button class="btn" type="submit">${isNew ? "주차 추가" : "수정 저장"}</button>
              <button class="btn ghost" type="button" data-act="cancel">취소</button>
            </div>
            ${LIVE ? "" : `<p class="muted wf-note">체험 모드: 이 브라우저에만 저장됩니다. 모든 방문자에게 보이려면 운영 모드(DB 연결)가 필요합니다.</p>`}
          </div>
        </form>`;
      document.body.appendChild(wrap);
      document.body.classList.add("modal-open");
      requestAnimationFrame(() => wrap.classList.add("show"));
      const form = $("form", wrap);
      $("#wfName", wrap).focus();
      $$(".wf-row", wrap).forEach((row) => { $(".wf-hint", row).textContent = hintFor(row.dataset.row, $(".wf-u", row).value.trim()); });

      const close = () => {
        wrap.classList.remove("show");
        document.body.classList.remove("modal-open");
        document.removeEventListener("keydown", onKey);
        setTimeout(() => wrap.remove(), 250);
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      };
      const onKey = (e) => { if (e.key === "Escape") close(); };
      document.addEventListener("keydown", onKey);
      wrap.addEventListener("click", (e) => {
        if (e.target === wrap || e.target.closest(".modal-x") || e.target.closest('[data-act="cancel"]')) return close();
        const add = e.target.closest("[data-row-add]");
        if (add) {
          const box = $(".wf-rows", add.closest(".wf-set"));
          box.insertAdjacentHTML("beforeend", rowHtml(add.dataset.rowAdd, {}));
          $(".wf-row:last-child .wf-t", box).focus();
        }
        const del = e.target.closest("[data-row-del]");
        if (del) del.closest(".wf-row").remove();
      });
      wrap.addEventListener("input", (e) => {
        const row = e.target.closest(".wf-row");
        if (row && e.target.matches(".wf-u")) $(".wf-hint", row).textContent = hintFor(row.dataset.row, e.target.value.trim());
      });
      $("#wfHasAs", wrap).addEventListener("change", (e) => { $(".wf-as", wrap).hidden = !e.target.checked; });

      // Google Drive 링크 붙여 넣기 → 제목을 자동으로 붙여 자료 목록에 추가
      const driveIn = $("#wfDrive", wrap), driveMsg = $("#wfDriveMsg", wrap);
      const driveTitle = (u) =>
        /\/document\//.test(u) ? "Google Docs 문서" : /\/presentation\//.test(u) ? "Google Slides 자료" :
        /\/spreadsheets\//.test(u) ? "Google Sheets 자료" : /\/forms\//.test(u) ? "Google Forms 설문" :
        /\/folders\//.test(u) ? "Google Drive 폴더" : "Google Drive 파일";
      const attachDrive = () => {
        const u = driveIn.value.trim();
        const say = (ok, t) => { driveMsg.className = "wf-attach-msg " + (ok ? "ok" : "no"); driveMsg.textContent = t; };
        if (!u) { say(false, "Google Drive 공유 링크를 붙여 넣어 주세요."); return driveIn.focus(); }
        if (!/^https:\/\/(drive|docs)\.google\.com\//i.test(u)) { say(false, "Google Drive · Docs 주소가 아닙니다. (https://drive.google.com/… 또는 https://docs.google.com/…)"); return driveIn.select(); }
        if ($$('.wf-row[data-row="material"] .wf-u', wrap).some((x) => x.value.trim() === u)) { say(false, "이미 첨부한 링크입니다."); return driveIn.select(); }
        const box = $(".wf-rows", driveIn.closest(".wf-set"));
        box.insertAdjacentHTML("beforeend", rowHtml("material", { title: driveTitle(u), url: u }));
        const row = $(".wf-row:last-child", box);
        $(".wf-hint", row).textContent = hintFor("material", u);
        driveIn.value = "";
        say(true, X.driveEmbed(u) ? "첨부했습니다. 제목을 알맞게 고쳐 주세요." : "첨부했습니다. 이 주소는 미리보기 없이 링크로 보입니다.");
        $(".wf-t", row).select();
      };
      $("#wfDriveAdd", wrap).addEventListener("click", attachDrive);
      driveIn.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); attachDrive(); } });
      driveIn.addEventListener("paste", () => setTimeout(attachDrive, 0));   // 붙여 넣으면 바로 첨부

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const need = [["wfName", "제목"]];
        const hasAs = $("#wfHasAs", wrap).checked;
        if (hasAs) need.push(["wfAsTitle", "과제 제목"], ["wfAsDue", "마감"]);
        let bad = null;
        ["wfName", "wfAsTitle", "wfAsDue"].forEach((id) => {
          const el = $("#" + id, wrap);
          el.closest(".field").classList.remove("invalid");
          $(".field-error", el.closest(".field")).textContent = "";
        });
        need.forEach(([id, label]) => {
          const el = $("#" + id, wrap);
          if (el.value.trim()) return;
          el.closest(".field").classList.add("invalid");
          $(".field-error", el.closest(".field")).textContent = `${label}을(를) 입력해 주세요.`;
          if (!bad) bad = el;
        });
        if (bad) return bad.focus();
        const rows = (kind) => $$(`.wf-row[data-row="${kind}"]`, wrap)
          .map((r) => ({ title: $(".wf-t", r).value.trim(), url: $(".wf-u", r).value.trim() }))
          .filter((x) => x.url);
        const next = Object.assign({}, isNew ? {} : w, {
          title: $("#wfName", wrap).value.trim(),
          summary: $("#wfSum", wrap).value.trim(),
          contents: $("#wfContents", wrap).value.split("\n").map((s) => s.trim()).filter(Boolean),
          videos: rows("video"),
          materials: rows("material")
        });
        const date = $("#wfDate", wrap).value;
        if (date) next.date = date; else delete next.date;
        if (hasAs) {
          next.assignment = Object.assign({}, as || {}, {
            title: $("#wfAsTitle", wrap).value.trim(),
            desc: $("#wfAsDesc", wrap).value.trim(),
            due: $("#wfAsDue", wrap).value.replace("T", " ")
          });
        } else delete next.assignment;
        if (isNew) list.push(next); else list[index] = next;
        const no = isNew ? list.length : index + 1;
        const sb = $("button[type=submit]", form);
        sb.disabled = true;
        persistWeeks(list, no, isNew ? `${no}주차를 추가했습니다.` : `${no}주차를 수정했습니다.`)
          .catch((err) => { setMsg($(".form-msg", wrap), "no", err.message); sb.disabled = false; });
      });
    };

    curSec.addEventListener("click", (e) => {
      if (!X.adminToken || !e.target.closest("[data-week-add], [data-week-edit], [data-week-del], [data-week-reset]")) return;
      e.preventDefault();                              // 주차 머리글의 '편집'을 눌러도 펼쳐지거나 접히지 않게
      if (LIVE && weeksLocked()) { alert("주차 내용을 불러오는 중입니다. 잠시 후 다시 눌러 주세요."); syncWeekAccess(); return; }
      const add = e.target.closest("[data-week-add]");
      const ed = e.target.closest("[data-week-edit]");
      const del = e.target.closest("[data-week-del]");
      const reset = e.target.closest("[data-week-reset]");
      if (add) openWeekForm(null);
      if (ed) openWeekForm(Number(ed.dataset.weekEdit));
      if (del) {
        const i = Number(del.dataset.weekDel), list = rawWeeks();
        if (!confirm(`${i + 1}주차 '${list[i].title}'을(를) 삭제할까요?\n\n뒤 주차의 번호와 날짜가 하나씩 앞당겨집니다. 이미 받은 출석·과제 기록은 주차 번호로 저장되어 있어 어긋날 수 있으니 학기 중에는 주의해 주세요.`)) return;
        list.splice(i, 1);
        persistWeeks(list, Math.min(i + 1, list.length), `${i + 1}주차를 삭제했습니다.`).catch((err) => alert(err.message));
      }
      if (reset) {
        if (!confirm("사이트에서 고친 주차별 강의를 모두 지우고 config.js 의 원래 내용으로 되돌릴까요?")) return;
        persistWeeks(null, "", "config.js 의 원래 주차별 강의로 되돌렸습니다.").catch((err) => alert(err.message));
      }
    });
  }

  /* =========================================================
     3-1. 수업 달력 일정 추가 (관리자) · 팝업 등록 · 공지사항 등록
     ========================================================= */
  const CAL = X.calendar;
  let calEvents = [];
  const evNoticeBody = (ev) => `${fmtDate(X.parseDate(ev.date))}${ev.time ? " " + ev.time : ""}${ev.body ? "\n" + ev.body : ""}`;
  const isAdminNow = () => !!X.adminToken;

  // 공지사항 등록: 일정과 연결된 공지(eventId)를 만들거나 고치거나 지움
  const syncEventNotice = (ev, removed) => api("getNotices").then((r) => {
    const list = (r.notices || []).filter((n) => n.eventId !== ev.id);
    const had = list.length !== (r.notices || []).length;
    if (!removed && ev.notice) {
      list.push({ date: keyOf(today()), title: `[일정] ${ev.title}`, body: evNoticeBody(ev), important: false, eventId: ev.id });
    } else if (!had) return null;                     // 바꿀 공지 없음
    return api("saveNotices", { adminToken: X.adminToken, notices: list }).then(() => X.refreshNotices && X.refreshNotices());
  });

  const loadEvents = () => api("getEvents").then((r) => {
    calEvents = r.events || [];
    if (CAL) CAL.setCustom(calEvents);
    return calEvents;
  }).catch(() => calEvents);

  const openEventForm = (ev) => {
    const isNew = !ev;
    ev = ev || { id: "", date: CAL ? CAL.selected() : keyOf(today()), time: "", title: "", body: "", popup: false, notice: false };
    const lastFocus = document.activeElement;
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `
      <form class="modal ev-modal" role="dialog" aria-modal="true" aria-labelledby="evTitle" novalidate>
        <button class="modal-x" type="button" aria-label="Close">×</button>
        <div class="modal-body">
          <h2 id="evTitle">${isNew ? "일정 추가" : "일정 수정"}</h2>
          <div class="ev-row">
            <div class="field"><label for="evDate">날짜 <span class="req">*</span></label><input id="evDate" type="date" value="${esc(ev.date)}"><div class="field-error"></div></div>
            <div class="field"><label for="evTime">시간 <span class="opt">(선택)</span></label><input id="evTime" type="time" value="${esc(ev.time || "")}"></div>
          </div>
          <div class="field"><label for="evName">제목 <span class="req">*</span></label><input id="evName" value="${esc(ev.title)}" placeholder="예: 중간 포트폴리오 점검"><div class="field-error"></div></div>
          <div class="field"><label for="evBody">내용 <span class="opt">(선택)</span></label><textarea id="evBody" rows="3">${esc(ev.body || "")}</textarea></div>
          <div class="ev-checks">
            <label class="consent"><input type="checkbox" id="evPopup" ${ev.popup ? "checked" : ""}> <span><b>팝업 등록</b><small>사이트에 들어오면 이 일정을 안내 팝업으로 보여 줍니다. (일정 날짜까지)</small></span></label>
            <label class="consent"><input type="checkbox" id="evNotice" ${ev.notice ? "checked" : ""}> <span><b>공지사항 등록</b><small>공지사항 목록에도 이 일정을 올립니다.</small></span></label>
          </div>
          <div class="form-msg" role="alert"></div>
          <div class="form-actions">
            <button class="btn" type="submit">${isNew ? "일정 추가" : "수정 저장"}</button>
            <button class="btn ghost" type="button" data-act="cancel">취소</button>
          </div>
        </div>
      </form>`;
    document.body.appendChild(wrap);
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => wrap.classList.add("show"));
    const form = $("form", wrap);
    $("#evName", wrap).focus();
    const close = () => {
      wrap.classList.remove("show");
      if (!document.querySelector(".admin.show")) document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", onKey);
      setTimeout(() => wrap.remove(), 250);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap || e.target.closest(".modal-x") || e.target.closest('[data-act="cancel"]')) close();
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let bad = null;
      [["evDate", "날짜"], ["evName", "제목"]].forEach(([id, label]) => {
        const el = $("#" + id, wrap), empty = !el.value.trim();
        el.closest(".field").classList.toggle("invalid", empty);
        $(".field-error", el.closest(".field")).textContent = empty ? `${label}을(를) 입력해 주세요.` : "";
        if (empty && !bad) bad = el;
      });
      if (bad) return bad.focus();
      const next = {
        id: ev.id || "ev" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        date: $("#evDate", wrap).value, time: $("#evTime", wrap).value, title: $("#evName", wrap).value.trim(),
        body: $("#evBody", wrap).value.trim(), popup: $("#evPopup", wrap).checked, notice: $("#evNotice", wrap).checked
      };
      const list = calEvents.filter((x) => x.id !== next.id).concat(next);
      const sb = $("button[type=submit]", form);
      sb.disabled = true;
      api("saveEvents", { adminToken: X.adminToken, events: list })
        .then(() => { calEvents = list; if (CAL) { CAL.setCustom(calEvents); CAL.select(next.date); } })
        .then(() => syncEventNotice(next, false))
        .then(() => { close(); })
        .catch((err) => { const m = $(".form-msg", wrap); m.className = "form-msg show no"; m.textContent = err.message; sb.disabled = false; });
    });
  };

  if (CAL && $("#calAdd")) {
    const addBtn = $("#calAdd");
    const syncCalAdmin = () => { addBtn.hidden = !isAdminNow(); CAL.redraw(); };
    document.addEventListener("rw-admin", syncCalAdmin);
    addBtn.addEventListener("click", () => openEventForm(null));
    $("#dayPanel").addEventListener("click", (e) => {
      if (!isAdminNow()) return;
      const ed = e.target.closest("[data-ev-edit]"), del = e.target.closest("[data-ev-del]");
      if (ed) openEventForm(calEvents.find((x) => x.id === ed.dataset.evEdit));
      if (del) {
        const ev = calEvents.find((x) => x.id === del.dataset.evDel);
        if (!ev || !confirm(`'${ev.title}' 일정을 삭제할까요?${ev.notice ? "\n연결된 공지도 함께 삭제됩니다." : ""}`)) return;
        const list = calEvents.filter((x) => x.id !== ev.id);
        api("saveEvents", { adminToken: X.adminToken, events: list })
          .then(() => { calEvents = list; CAL.setCustom(calEvents); })
          .then(() => syncEventNotice(ev, true))
          .catch((err) => alert(err.message));
      }
    });
  }

  // 팝업 등록된 일정: 일정 날짜까지 방문자에게 안내 팝업 (다른 팝업이 떠 있으면 닫힌 뒤에)
  const showEventPopup = () => {
    const t = keyOf(today());
    const list = calEvents.filter((ev) => ev.popup && ev.date >= t).sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
    if (!list.length || Date.now() < store.get("evPopupHideUntil", 0)) return;
    const wait = () => {
      if (document.querySelector(".modal-backdrop, .admin.show")) return setTimeout(wait, 700);
      const lastFocus = document.activeElement;
      const wrap = document.createElement("div");
      wrap.className = "modal-backdrop";
      wrap.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="evPopTitle">
          <button class="modal-x" type="button" aria-label="Close">×</button>
          <div class="modal-body">
            <span class="badge">Upcoming event</span>
            <h2 id="evPopTitle">${list.length === 1 ? esc(list[0].title) : "Upcoming events"}</h2>
            <ul class="ev-pop-list">${list.map((ev) => `
              <li><b>${esc(fmtDate(X.parseDate(ev.date)))}${ev.time ? " " + esc(ev.time) : ""}</b>${list.length > 1 ? ` · ${esc(ev.title)}` : ""}
                ${ev.body ? `<p>${esc(ev.body).replace(/\n/g, "<br>")}</p>` : ""}</li>`).join("")}</ul>
            ${$("#calendar") ? `<a class="btn btn-lg modal-cta" href="#calendar" data-ev-goto="${esc(list[0].date)}">View in calendar</a>` : ""}
          </div>
          <div class="modal-foot">
            <button type="button" class="link-btn" data-act="today">Don't show again today</button>
            <button type="button" class="link-btn" data-act="close">Close</button>
          </div>
        </div>`;
      document.body.appendChild(wrap);
      document.body.classList.add("modal-open");
      requestAnimationFrame(() => wrap.classList.add("show"));
      ($(".modal-cta", wrap) || $(".modal-x", wrap)).focus();
      const close = () => {
        wrap.classList.remove("show");
        document.body.classList.remove("modal-open");
        document.removeEventListener("keydown", onKey);
        setTimeout(() => wrap.remove(), 250);
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      };
      const onKey = (e) => { if (e.key === "Escape") close(); };
      document.addEventListener("keydown", onKey);
      wrap.addEventListener("click", (e) => {
        const g = e.target.closest("[data-ev-goto]");
        if (g && CAL) CAL.select(g.dataset.evGoto);
        if (e.target === wrap || g || e.target.closest(".modal-x") || e.target.closest('[data-act="close"]')) close();
        if (e.target.closest('[data-act="today"]')) {
          const n = new Date();
          store.set("evPopupHideUntil", new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1).getTime());
          close();
        }
      });
    };
    const promoDelay = C.popup && C.popup.enabled ? (C.popup.delaySeconds || 0) * 1000 + 400 : 0;   // 수강 신청 팝업 다음에
    setTimeout(wait, Math.max(800, promoDelay));
  };

  loadEvents().then(showEventPopup);

  /* =========================================================
     4. 첫 방문 수강 신청 안내 팝업 (오늘 하루 보지 않기)
     ========================================================= */
  const P = C.popup;
  const hideUntil = store.get("popupHideUntil", 0);
  if (P && P.enabled && Date.now() >= hideUntil && !store.get("applied", false)) {
    setTimeout(() => {
      const lastFocus = document.activeElement;
      const wrap = document.createElement("div");
      wrap.className = "modal-backdrop";
      wrap.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="promoTitle" aria-describedby="promoText">
          <button class="modal-x" type="button" aria-label="Close">×</button>
          <div class="modal-sky" aria-hidden="true"></div>
          <div class="modal-body">
            <span class="badge">${esc(P.badge)}</span>
            <h2 id="promoTitle">${esc(P.title)}</h2>
            <p id="promoText">${esc(P.text)}</p>
            ${P.points && P.points.length ? `<ul>${P.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
            <a class="btn btn-lg modal-cta" href="#${esc(P.button.target)}">${esc(P.button.label)}</a>
          </div>
          <div class="modal-foot">
            <button type="button" class="link-btn" data-act="today">Don't show again today</button>
            <button type="button" class="link-btn" data-act="close">Close</button>
          </div>
        </div>`;
      document.body.appendChild(wrap);
      document.body.classList.add("modal-open");
      requestAnimationFrame(() => wrap.classList.add("show"));
      $(".modal-cta", wrap).focus();

      const close = () => {
        wrap.classList.remove("show");
        document.body.classList.remove("modal-open");
        document.removeEventListener("keydown", onKey);
        setTimeout(() => wrap.remove(), 250);
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      };
      const onKey = (e) => {
        if (e.key === "Escape") close();
        if (e.key === "Tab") {                     // 팝업 안에서만 포커스 이동
          const f = $$("a, button", wrap);
          if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
        }
      };
      document.addEventListener("keydown", onKey);
      wrap.addEventListener("click", (e) => {
        if (e.target === wrap || e.target.closest(".modal-x") || e.target.closest('[data-act="close"]') || e.target.closest(".modal-cta")) close();
        if (e.target.closest('[data-act="today"]')) {
          const t = new Date();
          store.set("popupHideUntil", new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1).getTime());   // 내일 0시까지
          close();
        }
      });
    }, Math.max(0, (P.delaySeconds || 0) * 1000));
  }
})();
