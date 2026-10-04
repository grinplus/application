/* =========================================================
   수업 사이트 서버 — 사이트 파일 제공 + 참여 데이터를 PostgreSQL 에 저장
   ---------------------------------------------------------
   · Railway 에서 실행: 환경 변수 DATABASE_URL (Postgres 연결 주소) 필요
   · 사이트(config.js 의 backend.url = "/api")가 보내는 요청을 처리합니다.
     투표 · 설문 기록 · 수강 신청 · 로그인 · 출석 · 과제 파일 · 공지 · 달력 일정
   · 관리자 비밀번호와 수업 날짜는 config.js 를 그대로 읽어 씁니다.
   ========================================================= */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const vm = require("vm");
const { Pool } = require("pg");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8080;
const TZ = "Asia/Seoul";
const MAX_FILE_MB = 10;
const MAX_BODY = 20 * 1024 * 1024;          // base64 로 보낸 10MB 파일 + 여유

/* ---------- config.js 읽기 ---------- */
const CFG = (() => {
  const box = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "config.js"), "utf8"), box);
  return box.window.SITE_CONFIG || {};
})();

const addDays = (ymd, n) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
// 주차별 수업 날짜 (app.js 와 같은 방식: 시작일부터 매주, 휴강일은 건너뜀)
const classDates = (weeks) => {
  const S = CFG.schedule || {};
  const hol = new Set((S.holidays || []).map((h) => String(h.date).slice(0, 10)));
  let d = String(S.startDate || "").slice(0, 10);
  if (!d) return [];
  return (weeks || []).map((w) => {
    if (w && w.date) d = String(w.date).slice(0, 10);
    else while (hol.has(d)) d = addDays(d, 7);
    const out = d;
    d = addDays(d, 7);
    return out;
  });
};
const CONFIG_WEEKS = (CFG.curriculum && CFG.curriculum.weeks) || [];
// 승인 전 방문자에게 보내는 주차 정보: 제목 · 요약 · 날짜 · 과제 제목/마감만
const lockWeek = (w) => {
  const o = { title: w.title || "", summary: w.summary || "", locked: true };
  ["date", "time", "place"].forEach((k) => { if (w[k]) o[k] = w[k]; });
  if (w.assignment) o.assignment = { title: w.assignment.title || "", due: w.assignment.due || "" };
  return o;
};
// 관리자가 사이트에서 고친 주차별 강의 (없으면 null → config.js 그대로)
const savedWeeks = async () => {
  if (!dbReady) return null;
  const r = await q("SELECT value FROM settings WHERE key = 'curriculum'");
  if (!r.rows.length) return null;
  try { const w = JSON.parse(r.rows[0].value); return Array.isArray(w) ? w : null; } catch (e) { return null; }
};
const todaySeoul = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

/* ---------- 데이터베이스 ---------- */
const DB_URL = process.env.DATABASE_URL || "";
const pool = DB_URL
  ? new Pool({
      connectionString: DB_URL,
      // Railway 내부 주소(*.railway.internal)는 SSL 없이, 외부 주소는 SSL 로 연결
      ssl: /railway\.internal/.test(DB_URL) || /sslmode=disable/.test(DB_URL) ? false : { rejectUnauthorized: false },
      max: 5
    })
  : null;
let dbReady = false;
let dbError = DB_URL ? "" : "DATABASE_URL 이 설정되지 않았습니다.";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key text PRIMARY KEY, value text NOT NULL);
CREATE TABLE IF NOT EXISTS roster (sid text PRIMARY KEY, name text NOT NULL, pin text NOT NULL);
CREATE TABLE IF NOT EXISTS notices (id serial PRIMARY KEY, ord int NOT NULL DEFAULT 0, date text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '', body text NOT NULL DEFAULT '', important boolean NOT NULL DEFAULT false, event_id text NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS votes (pid text NOT NULL, voter text NOT NULL, option int NOT NULL, at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pid, voter));
CREATE TABLE IF NOT EXISTS polls (pid text PRIMARY KEY, title text NOT NULL DEFAULT '', options jsonb NOT NULL DEFAULT '[]',
  counts jsonb NOT NULL DEFAULT '[]', hidden_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS applications (id serial PRIMARY KEY, at timestamptz NOT NULL DEFAULT now(), sid text, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS attendance (sid text NOT NULL, week int NOT NULL, name text NOT NULL DEFAULT '', date text NOT NULL,
  at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (sid, week));
CREATE TABLE IF NOT EXISTS files (id uuid PRIMARY KEY, name text NOT NULL, mime text NOT NULL, size int NOT NULL, data bytea NOT NULL);
CREATE TABLE IF NOT EXISTS submissions (id serial PRIMARY KEY, at timestamptz NOT NULL DEFAULT now(), sid text NOT NULL, name text NOT NULL DEFAULT '',
  week int NOT NULL, file_name text NOT NULL, size int NOT NULL DEFAULT 0, late boolean NOT NULL DEFAULT false, file_id uuid);
CREATE TABLE IF NOT EXISTS events (id text PRIMARY KEY, date text NOT NULL, time text NOT NULL DEFAULT '', title text NOT NULL,
  body text NOT NULL DEFAULT '', popup boolean NOT NULL DEFAULT false, notice boolean NOT NULL DEFAULT false);
-- v1.1: 수강생 승인 상태 (approved / pending) 와 등록 시각
ALTER TABLE roster ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';
ALTER TABLE roster ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
`;
// 4자리 PIN (신청서에 PIN 이 없으면 자동 생성)
const randomPin = () => String(crypto.randomInt(1000, 10000));
const validPin = (p) => (/^\d{4}$/.test(String(p || "").trim()) ? String(p).trim() : "");

let SECRET = process.env.SECRET || "";
const initDb = async () => {
  if (!pool) return;
  for (let i = 1; i <= 10; i++) {                       // 배포 직후엔 DB 가 늦게 뜰 수 있어 몇 번 재시도
    try {
      await pool.query(SCHEMA);
      if (!SECRET) {
        const r = await pool.query("SELECT value FROM settings WHERE key = 'secret'");
        if (r.rows.length) SECRET = r.rows[0].value;
        else {
          SECRET = crypto.randomBytes(32).toString("hex");
          await pool.query("INSERT INTO settings (key, value) VALUES ('secret', $1) ON CONFLICT (key) DO NOTHING", [SECRET]);
          SECRET = (await pool.query("SELECT value FROM settings WHERE key = 'secret'")).rows[0].value;
        }
      }
      // v1.1 이전에 신청했지만 명단에 없는 학생을 '승인 대기'로 한 번만 옮김
      const done = await pool.query("SELECT 1 FROM settings WHERE key = 'roster_backfill_v11'");
      if (!done.rows.length) {
        const apps = await pool.query("SELECT sid, data, at FROM applications WHERE sid IS NOT NULL AND sid <> '' ORDER BY at");
        for (const a of apps.rows) {
          await pool.query(`INSERT INTO roster (sid, name, pin, status, created_at) VALUES ($1, $2, $3, 'pending', $4)
                            ON CONFLICT (sid) DO NOTHING`,
            [a.sid, String((a.data && a.data.name) || ""), validPin(a.data && a.data.pin) || randomPin(), a.at]);
        }
        await pool.query("INSERT INTO settings (key, value) VALUES ('roster_backfill_v11', $1) ON CONFLICT (key) DO NOTHING", [String(apps.rows.length)]);
        console.log(`[db] roster backfill: ${apps.rows.length} application(s) checked`);
      }
      // 관리자 비밀번호: 관리자 화면에서 바꾼 값(DB)이 있으면 그것, 없으면 config.js
      const ac = await pool.query("SELECT value FROM settings WHERE key = 'admin_cred'");
      if (ac.rows.length) { try { const o = JSON.parse(ac.rows[0].value); if (o.salt && o.passwordHash) ADMIN_CRED = o; } catch (e) {} }
      dbReady = true;
      dbError = "";
      console.log("[db] ready");
      return;
    } catch (e) {
      dbError = e.message;
      console.error(`[db] init failed (${i}/10):`, e.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
};

const q = (sql, params) => pool.query(sql, params);
const tx = async (fn) => {
  const c = await pool.connect();
  try { await c.query("BEGIN"); const out = await fn(c); await c.query("COMMIT"); return out; }
  catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; }
  finally { c.release(); }
};

/* ---------- 인증 ---------- */
const sha256 = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex");
const token = (sid) => crypto.createHmac("sha256", SECRET).update(String(sid).trim()).digest("base64url");
const same = (a, b) => {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const fail = (msg) => { const e = new Error(msg); e.expose = true; throw e; };
// 관리자 비밀번호 (salt + SHA-256). 시작할 때 DB 값으로 바뀔 수 있음
let ADMIN_CRED = { salt: (CFG.admin && CFG.admin.salt) || "", passwordHash: (CFG.admin && CFG.admin.passwordHash) || "" };
const checkAdminPassword = (pw) => {
  const p = String(pw || "");
  // 비상용: Railway 변수 ADMIN_PASSWORD 를 정해 두면 그 비밀번호로도 로그인 가능
  if (process.env.ADMIN_PASSWORD && p && same(p, process.env.ADMIN_PASSWORD)) return true;
  return !!ADMIN_CRED.passwordHash && same(sha256(`${ADMIN_CRED.salt}::${p}`), ADMIN_CRED.passwordHash);
};
// 관리자 토큰은 현재 비밀번호에 묶임 → 비밀번호를 바꾸면 예전 로그인은 자동으로 풀림
const adminToken = () => token(`__admin__|${ADMIN_CRED.passwordHash}`);
const isAdmin = (req) => !!req.adminToken && same(req.adminToken, adminToken());
const requireAdmin = (req) => { if (!isAdmin(req)) fail("관리자 로그인이 필요합니다."); };
const PENDING_MSG = "Your enrollment is waiting for instructor approval. You can log in once it is approved.";
// 학생 확인: 토큰이 맞고, 명단에 있고, 승인된 학생만
const requireStudent = async (req) => {
  if (!req.sid || !same(req.token, token(req.sid))) fail("Please log in again.");
  const r = await q("SELECT sid, name, status FROM roster WHERE sid = $1", [String(req.sid).trim()]);
  if (!r.rows.length) fail("This student ID is not on the class list. Please log in again.");
  if (r.rows[0].status !== "approved") fail(PENDING_MSG);
  return r.rows[0];
};
const iso = (v) => (v instanceof Date ? v.toISOString() : String(v || ""));
const fileUrl = (id) => (id ? `/api/file/${id}` : "");

/* ---------- 요청 처리 (사이트의 action 이름과 같음) ---------- */
const ACTIONS = {
  /* 투표 */
  async getVotes(req) {
    const n = Math.max(1, Math.min(50, Number(req.n) || 1));
    const pid = String(req.pid || "");
    const counts = Array.from({ length: n }, () => 0);
    let mine = null;
    const r = await q("SELECT voter, option FROM votes WHERE pid = $1", [pid]);
    r.rows.forEach((v) => {
      if (v.option >= 0 && v.option < n) counts[v.option]++;
      if (v.voter === String(req.voterId)) mine = v.option;
    });
    const h = await q("SELECT 1 FROM polls WHERE pid = $1", [pid]);
    return { counts, mine, hidden: h.rows.length > 0 };
  },
  async vote(req) {
    const n = Number(req.n) || 1, opt = Number(req.option), pid = String(req.pid || "");
    if (!(opt >= 0 && opt < n) || !req.voterId) fail("Invalid vote.");
    if ((await q("SELECT 1 FROM polls WHERE pid = $1", [pid])).rows.length) fail("This poll is closed.");
    await q(`INSERT INTO votes (pid, voter, option) VALUES ($1, $2, $3)
             ON CONFLICT (pid, voter) DO UPDATE SET option = EXCLUDED.option, at = now()`, [pid, String(req.voterId), opt]);
    return ACTIONS.getVotes(req);
  },

  /* 수강 신청 */
  async apply(req) {
    const d = req.data && typeof req.data === "object" ? req.data : {};
    const sid = d.sid ? String(d.sid).trim() : null;
    if (sid && (await q("SELECT 1 FROM applications WHERE sid = $1", [sid])).rows.length) fail("An application has already been submitted with this student ID.");
    await tx(async (c) => {
      await c.query("INSERT INTO applications (sid, data) VALUES ($1, $2)", [sid, JSON.stringify(d)]);
      // 신청하면 수강생 명단에 '승인 대기'로 자동 등록 (이미 명단에 있으면 그대로)
      if (sid) {
        await c.query(`INSERT INTO roster (sid, name, pin, status) VALUES ($1, $2, $3, 'pending') ON CONFLICT (sid) DO NOTHING`,
          [sid, String(d.name || "").trim(), validPin(d.pin) || randomPin()]);
      }
    });
    return {};
  },

  /* 로그인 · 내 기록 */
  async login(req) {
    const r = await q("SELECT sid, name, pin, status FROM roster WHERE sid = $1", [String(req.sid || "").trim()]);
    const s = r.rows[0];
    if (!s || s.name.trim() !== String(req.name || "").trim() || s.pin.trim() !== String(req.pin || "").trim()) {
      fail("Your student ID, name, or PIN is incorrect.");
    }
    if (s.status !== "approved") fail(PENDING_MSG);
    return { sid: s.sid, name: s.name, token: token(s.sid) };
  },

  /* 주차별 학습 내용 전체 — 관리자 또는 승인된 수강생만 */
  async getWeeks(req) {
    if (!isAdmin(req)) await requireStudent(req);
    return { weeks: (await savedWeeks()) || CONFIG_WEEKS };
  },
  async status(req) {
    const me = await requireStudent(req);
    const a = await q("SELECT week, at FROM attendance WHERE sid = $1", [me.sid]);
    const s = await q("SELECT at, week, file_name, size, late, file_id FROM submissions WHERE sid = $1 ORDER BY at", [me.sid]);
    const attendance = {};
    a.rows.forEach((r) => (attendance[r.week] = iso(r.at)));
    return {
      attendance,
      submissions: s.rows.map((r) => ({ at: iso(r.at), week: r.week, fileName: r.file_name, size: r.size, late: r.late, url: fileUrl(r.file_id) }))
    };
  },

  /* 출석: 오늘(한국 시간)이 그 주차 수업일일 때만 */
  async attend(req) {
    const me = await requireStudent(req);
    const t = todaySeoul(), week = Number(req.week);
    const dates = classDates((await savedWeeks()) || CONFIG_WEEKS);
    if (req.date !== t || (dates.length && dates[week - 1] !== t)) fail("Check-in is only open on class days.");
    const r = await q(`INSERT INTO attendance (sid, week, name, date) VALUES ($1, $2, $3, $4)
                       ON CONFLICT (sid, week) DO NOTHING RETURNING at`, [me.sid, week, me.name, t]);
    if (!r.rows.length) fail("You have already checked in.");
    return { at: iso(r.rows[0].at) };
  },

  /* 과제 파일 제출 → files 테이블에 파일, submissions 에 기록 */
  async submit(req) {
    const me = await requireStudent(req);
    if (!req.data || !req.fileName) fail("No file was received.");
    const bytes = Buffer.from(String(req.data), "base64");
    if (bytes.length > MAX_FILE_MB * 1024 * 1024) fail(`The file is too large (${MAX_FILE_MB}MB max).`);
    const id = crypto.randomUUID();
    await tx(async (c) => {
      await c.query("INSERT INTO files (id, name, mime, size, data) VALUES ($1, $2, $3, $4, $5)",
        [id, String(req.fileName), String(req.mimeType || "application/octet-stream"), bytes.length, bytes]);
      await c.query("INSERT INTO submissions (sid, name, week, file_name, size, late, file_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [me.sid, me.name, Number(req.week), String(req.fileName), bytes.length, !!req.late, id]);
    });
    return {};
  },

  /* 공지 (누구나 읽기). 관리자가 한 번도 저장하지 않았으면 config.js 의 기본 공지 */
  async getNotices() {
    const saved = (await q("SELECT 1 FROM settings WHERE key = 'notices_saved'")).rows.length > 0;
    if (!saved) return { notices: (CFG.notices && CFG.notices.items) || [] };
    const r = await q("SELECT date, title, body, important, event_id FROM notices ORDER BY ord, id");
    return { notices: r.rows.map((n) => ({ date: n.date, title: n.title, body: n.body, important: n.important, eventId: n.event_id })) };
  },

  /* 달력 일정 (누구나 읽기) */
  async getEvents() {
    const r = await q("SELECT id, date, time, title, body, popup, notice FROM events ORDER BY date, time");
    return { events: r.rows };
  },

  /* ----- 아래는 관리자만 ----- */
  async adminLogin(req) {
    if (!checkAdminPassword(req.password)) fail("관리자 비밀번호가 맞지 않습니다.");
    return { adminToken: adminToken() };
  },
  /* 저장된 관리자 로그인이 아직 유효한지 확인 */
  async adminPing(req) { requireAdmin(req); return {}; },
  /* 관리자 비밀번호 변경 → DB 에 저장 (모든 컴퓨터에 바로 적용) */
  async changeAdminPassword(req) {
    requireAdmin(req);
    if (!checkAdminPassword(req.current)) fail("현재 비밀번호가 맞지 않습니다.");
    const next = String(req.next || "");
    if (next.length < 8) fail("새 비밀번호는 8자 이상으로 정해 주세요.");
    const salt = "rw-" + crypto.randomBytes(6).toString("hex");
    const cred = { salt, passwordHash: sha256(`${salt}::${next}`) };
    await q(`INSERT INTO settings (key, value) VALUES ('admin_cred', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [JSON.stringify(cred)]);
    ADMIN_CRED = cred;
    console.log("[admin] password changed");
    return { adminToken: adminToken(), salt: cred.salt, passwordHash: cred.passwordHash };
  },
  async adminData(req) {
    requireAdmin(req);
    const [ro, ap, at, sb] = await Promise.all([
      q("SELECT sid, name, pin, status, created_at FROM roster ORDER BY created_at, sid"),
      q("SELECT at, data FROM applications ORDER BY at"),
      q("SELECT sid, name, week, at FROM attendance ORDER BY at"),
      q("SELECT at, sid, name, week, file_name, size, late, file_id FROM submissions ORDER BY at")
    ]);
    return {
      roster: ro.rows.map((r) => ({ sid: r.sid, name: r.name, pin: r.pin, status: r.status, createdAt: iso(r.created_at) })),
      applications: ap.rows.map((r) => Object.assign({}, r.data, { at: iso(r.at) })),
      attendance: at.rows.map((r) => ({ at: iso(r.at), sid: r.sid, name: r.name, week: r.week })),
      submissions: sb.rows.map((r) => ({ at: iso(r.at), sid: r.sid, name: r.name, week: r.week, fileName: r.file_name, size: r.size, late: r.late, url: fileUrl(r.file_id) }))
    };
  },
  async saveRoster(req) {
    requireAdmin(req);
    const list = (req.roster || []).filter((r) => r && r.sid && r.name);
    const okStatus = (s) => (s === "approved" || s === "pending" ? s : null);
    await tx(async (c) => {
      // 목록에서 빠진 학생은 삭제, 나머지는 추가·수정 (승인 상태는 값이 없으면 기존 상태 유지)
      await c.query("DELETE FROM roster WHERE NOT (sid = ANY($1::text[]))", [list.map((r) => String(r.sid).trim())]);
      for (const r of list) {
        await c.query(`INSERT INTO roster (sid, name, pin, status) VALUES ($1, $2, $3, COALESCE($4, 'approved'))
                       ON CONFLICT (sid) DO UPDATE SET name = EXCLUDED.name, pin = EXCLUDED.pin, status = COALESCE($4, roster.status)`,
          [String(r.sid).trim(), String(r.name).trim(), String(r.pin == null ? "" : r.pin).trim(), okStatus(r.status)]);
      }
    });
    return {};
  },

  /* 강의 관리: 수강생 한 명 추가 · 승인 · PIN 변경 · 삭제 */
  async addStudent(req) {
    requireAdmin(req);
    const sid = String(req.sid || "").trim(), name = String(req.name || "").trim();
    if (!/^\d+$/.test(sid) || !name) fail("학번(숫자)과 이름을 입력해 주세요.");
    const pin = validPin(req.pin) || randomPin();
    const r = await q(`INSERT INTO roster (sid, name, pin, status) VALUES ($1, $2, $3, 'approved') ON CONFLICT (sid) DO NOTHING RETURNING sid`, [sid, name, pin]);
    if (!r.rows.length) fail(`학번 ${sid} 은(는) 이미 명단에 있습니다.`);
    return { pin };
  },
  async setStudentStatus(req) {
    requireAdmin(req);
    const status = req.status === "approved" ? "approved" : "pending";
    const r = await q("UPDATE roster SET status = $2 WHERE sid = $1 RETURNING sid", [String(req.sid || "").trim(), status]);
    if (!r.rows.length) fail("명단에 없는 학번입니다.");
    return { status };
  },
  async setStudentPin(req) {
    requireAdmin(req);
    const pin = validPin(req.pin);
    if (!pin) fail("PIN 은 숫자 4자리로 입력해 주세요.");
    const r = await q("UPDATE roster SET pin = $2 WHERE sid = $1 RETURNING sid", [String(req.sid || "").trim(), pin]);
    if (!r.rows.length) fail("명단에 없는 학번입니다.");
    return { pin };
  },
  async deleteStudent(req) {
    requireAdmin(req);
    await q("DELETE FROM roster WHERE sid = $1", [String(req.sid || "").trim()]);
    return {};
  },
  async saveNotices(req) {
    requireAdmin(req);
    const list = req.notices || [];
    await tx(async (c) => {
      await c.query("DELETE FROM notices");
      for (let i = 0; i < list.length; i++) {
        const n = list[i] || {};
        await c.query("INSERT INTO notices (ord, date, title, body, important, event_id) VALUES ($1, $2, $3, $4, $5, $6)",
          [i, String(n.date || ""), String(n.title || ""), String(n.body || ""), !!n.important, String(n.eventId || "")]);
      }
      await c.query("INSERT INTO settings (key, value) VALUES ('notices_saved', '1') ON CONFLICT (key) DO NOTHING");
    });
    return {};
  },
  async saveEvents(req) {
    requireAdmin(req);
    const list = req.events || [];
    await tx(async (c) => {
      await c.query("DELETE FROM events");
      for (const e of list) {
        if (!e || !e.id || !e.date) continue;
        await c.query("INSERT INTO events (id, date, time, title, body, popup, notice) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [String(e.id), String(e.date), String(e.time || ""), String(e.title || ""), String(e.body || ""), !!e.popup, !!e.notice]);
      }
    });
    return {};
  },

  /* 주차별 강의 저장 (weeks 가 null 이면 config.js 원래 내용으로 되돌림) */
  async saveCurriculum(req) {
    requireAdmin(req);
    if (req.weeks == null) {
      await q("DELETE FROM settings WHERE key = 'curriculum'");
      return {};
    }
    if (!Array.isArray(req.weeks)) fail("주차 정보가 올바르지 않습니다.");
    if (req.weeks.some((w) => w && w.locked)) fail("주차 내용을 아직 불러오지 못했습니다. 새로고침한 뒤 다시 시도해 주세요.");
    const str = (v) => String(v == null ? "" : v).slice(0, 2000);
    const links = (arr) => (Array.isArray(arr) ? arr : [])
      .filter((x) => x && /^https?:\/\//i.test(String(x.url || "")))
      .map((x) => ({ title: str(x.title), url: str(x.url) }));
    const weeks = req.weeks.slice(0, 60).map((w) => {
      const o = Object.assign({}, w, {
        title: str(w.title), summary: str(w.summary),
        contents: (Array.isArray(w.contents) ? w.contents : []).map(str).filter(Boolean),
        videos: links(w.videos), materials: links(w.materials)
      });
      if (o.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(o.date))) delete o.date;
      if (o.assignment) {
        const a = o.assignment;
        if (!a.title || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(String(a.due || ""))) fail("과제 제목과 마감 일시를 확인해 주세요.");
        o.assignment = Object.assign({}, a, { title: str(a.title), desc: str(a.desc), due: String(a.due) });
      }
      return o;
    });
    await q(`INSERT INTO settings (key, value) VALUES ('curriculum', $1)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [JSON.stringify(weeks)]);
    return {};
  },

  /* 설문 숨기기 · 다시 보이기 · 히스토리 */
  async hidePoll(req) {
    requireAdmin(req);
    const p = req.poll || {};
    if (!p.pid) fail("설문 정보가 없습니다.");
    const opts = Array.isArray(p.options) ? p.options.map(String) : [];
    const { counts } = await ACTIONS.getVotes({ pid: p.pid, n: opts.length || 1 });
    await q(`INSERT INTO polls (pid, title, options, counts) VALUES ($1, $2, $3, $4) ON CONFLICT (pid) DO NOTHING`,
      [String(p.pid), String(p.title || ""), JSON.stringify(opts), JSON.stringify(counts)]);
    return {};
  },
  async showPoll(req) {
    requireAdmin(req);
    await q("DELETE FROM polls WHERE pid = $1", [String(req.pid || "")]);
    return {};
  },
  async pollHistory(req) {
    requireAdmin(req);
    const r = await q("SELECT pid, title, options, counts, hidden_at FROM polls ORDER BY hidden_at");
    return { history: r.rows.map((h) => ({ pid: h.pid, title: h.title, options: h.options, counts: h.counts, hiddenAt: iso(h.hidden_at) })) };
  }
};

/* ---------- HTTP ---------- */
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon", ".md": "text/plain; charset=utf-8"
};
// 사이트 파일만 공개 (server.js, package.json, node_modules 등은 공개하지 않음)
const PUBLIC_FILES = new Set(["index.html", "guide.html", "style.css", "app.js", "features.js", "admin.js", "config.js", "AI-Powered Language Learning.png"]);
const PUBLIC_DIRS = ["images"];

const sendJson = (res, code, obj) => {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
};
const readBody = (req) => new Promise((resolve, reject) => {
  let size = 0; const chunks = [];
  req.on("data", (c) => { size += c.length; if (size > MAX_BODY) { reject(new Error("요청이 너무 큽니다.")); req.destroy(); } else chunks.push(c); });
  req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  req.on("error", reject);
});

const handleApi = async (req, res) => {
  if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "POST 로 요청해 주세요." });
  let body;
  try { body = JSON.parse(await readBody(req)); } catch (e) { return sendJson(res, 400, { ok: false, error: "잘못된 요청입니다." }); }
  const fn = ACTIONS[body && body.action];
  if (!fn) return sendJson(res, 400, { ok: false, error: "알 수 없는 요청입니다." });
  if (!dbReady) return sendJson(res, 503, { ok: false, error: "데이터베이스에 연결되지 않았습니다. 잠시 후 다시 시도해 주세요." });
  try {
    const out = (await fn(body)) || {};
    out.ok = true;
    sendJson(res, 200, out);
  } catch (e) {
    if (!e.expose) console.error(`[api] ${body.action}:`, e);
    sendJson(res, 200, { ok: false, error: e.expose ? e.message : "요청을 처리하지 못했습니다." });
  }
};

const handleFile = async (res, id) => {
  if (!dbReady || !/^[0-9a-f-]{36}$/i.test(id)) { res.writeHead(404); return res.end("Not found"); }
  const r = await q("SELECT name, mime, data FROM files WHERE id = $1", [id]);
  if (!r.rows.length) { res.writeHead(404); return res.end("Not found"); }
  const f = r.rows[0];
  res.writeHead(200, {
    "Content-Type": f.mime || "application/octet-stream",
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(f.name)}`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, max-age=3600"
  });
  res.end(Buffer.from(f.data));
};

const serveStatic = (res, urlPath) => {
  let rel = decodeURIComponent(urlPath).replace(/^\/+/, "") || "index.html";
  const top = rel.split("/")[0];
  const allowed = PUBLIC_FILES.has(rel) || (PUBLIC_DIRS.includes(top) && rel.includes("/"));
  const full = path.resolve(ROOT, rel);
  if (!allowed || !full.startsWith(ROOT + path.sep)) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Not found"); }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Not found"); }
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Cache-Control": /\.(html|js|css)$/.test(ext) ? "no-cache" : "public, max-age=86400"
    });
    res.end(data);
  });
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/api") return await handleApi(req, res);
    if (url.pathname === "/api/health") return sendJson(res, 200, { ok: true, db: dbReady, error: dbReady ? "" : dbError });
    if (url.pathname.startsWith("/api/file/")) return await handleFile(res, url.pathname.slice("/api/file/".length));
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
    // config.js: 주차별 학습 내용(학습 내용·영상·자료·과제 설명)은 빼고 보냄
    //  → 승인된 수강생·관리자만 getWeeks 로 전체 내용을 받음
    if (url.pathname === "/config.js") {
      let weeks = CONFIG_WEEKS;
      try { weeks = (await savedWeeks()) || CONFIG_WEEKS; } catch (e) { console.error("[config] curriculum:", e.message); }
      const cfg = Object.assign({}, CFG);
      if (CFG.curriculum) cfg.curriculum = Object.assign({}, CFG.curriculum, { weeks: weeks.map(lockWeek) });
      cfg.admin = { salt: ADMIN_CRED.salt, passwordHash: ADMIN_CRED.passwordHash };   // 관리자 화면에서 바꾼 비밀번호 반영
      const json = JSON.stringify(cfg, null, 1).split(String.fromCharCode(0x2028)).join("\\u2028").split(String.fromCharCode(0x2029)).join("\\u2029");
      res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache" });
      return res.end(`/* Site settings — weekly lesson details are only sent to approved students. */\nwindow.SITE_CONFIG = ${json};\n`);
    }
    serveStatic(res, url.pathname);
  } catch (e) {
    console.error("[http]", e);
    if (!res.headersSent) { res.writeHead(500); res.end("Server error"); }
  }
});
server.listen(PORT, () => {
  console.log(`[http] listening on ${PORT}`);
  initDb();
});
// Railway 도메인이 8080 포트로 설정돼 있는 경우를 위해 8080 도 함께 엽니다
if (PORT !== 8080) {
  http.createServer((req, res) => server.emit("request", req, res))
    .on("error", (e) => console.log("[http] 8080 skipped:", e.message))
    .listen(8080, () => console.log("[http] also listening on 8080"));
}
