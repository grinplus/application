/* =========================================================
   수업 사이트 백엔드 — Google Apps Script (구글 시트 + 구글 드라이브)
   ---------------------------------------------------------
   투표 · 수강 신청 · 로그인 · 출석 · 과제 파일을 구글 시트/드라이브에 저장합니다.
   별도 서버 없이 무료로 운영할 수 있습니다.

   [설치 방법]
   1. 구글 드라이브에서 새 '구글 스프레드시트'를 만듭니다.
   2. 메뉴 [확장 프로그램] → [Apps Script] 를 열고, 이 파일 내용을 전부 붙여 넣습니다.
   3. 아래 '설정' 부분을 고칩니다.
        - DRIVE_FOLDER_ID : 과제 파일을 모을 드라이브 폴더 주소에서
                            .../folders/ 뒤의 긴 문자열
        - CLASS_DATES     : 수업 날짜 목록 (사이트 '주차별 강의' 날짜와 같게)
   4. 위쪽 함수 선택에서 setup 을 고르고 [실행] → 권한 승인
      → 시트에 '공지, 일정, 명단, 투표, 설문기록, 수강신청, 출석, 과제제출' 탭이 생깁니다.
   5. 수강생 명단은 사이트의 관리자 화면 → [수강생 명단] 에서 등록하면 됩니다.
      (시트의 '명단' 탭에 학번 · 이름 · PIN 을 직접 입력해도 됩니다)
   6. [배포] → [새 배포] → 유형 '웹 앱'
        - 다음 사용자 인증 정보로 실행: 나
        - 액세스 권한이 있는 사용자: 모든 사용자
      → [배포] 후 나오는 '웹 앱 URL' 을 복사합니다.
   7. 사이트의 config.js → backend.url 에 그 주소를 붙여 넣으면 끝!

   ※ 이 코드를 고친 뒤에는 [배포] → [배포 관리] → 수정(연필) → 버전 '새 버전' 으로
     다시 배포해야 반영됩니다.
   ※ 보안 안내: PIN 방식은 간단한 수업용 확인 장치입니다. 성적 등 민감한 정보는
     이 시스템에 두지 마세요.
   ========================================================= */

/* ---------- 설정 ---------- */
const DRIVE_FOLDER_ID = "";            // 과제 파일 저장 폴더 ID (비우면 내 드라이브 최상위)
const TIMEZONE = "Asia/Seoul";
const MAX_FILE_MB = 10;
const CLASS_DATES = [                  // 출석은 이 날짜에만 가능 (비우면 날짜 확인 안 함)
  "2026-09-01", "2026-09-08", "2026-09-15", "2026-09-22", "2026-09-29",
  "2026-10-06", "2026-10-13", "2026-10-20", "2026-10-27", "2026-11-03",
  "2026-11-10", "2026-11-17", "2026-11-24", "2026-12-01", "2026-12-08"
];

/* 관리자 비밀번호 (사이트 config.js 의 admin.salt / admin.passwordHash 와 같은 값)
   관리자 화면에서 비밀번호를 바꾸면 화면에 새 값이 표시되니 그대로 옮겨 적으세요. */
const ADMIN_SALT = "rw-2026";
const ADMIN_HASH = "66be70f79fa4b7469c43b9e9c3fd7db4742d663e11b45f70c38b37929a0782a3";

/* ---------- 시트 구성 ---------- */
const SHEETS = {
  notices: { name: "공지",     header: ["날짜", "제목", "내용", "중요", "일정 ID"] },
  events:  { name: "일정",     header: ["ID", "날짜", "시간", "제목", "내용", "팝업", "공지"] },
  roster:  { name: "명단",     header: ["학번", "이름", "PIN"] },
  votes:   { name: "투표",     header: ["시각", "투표자", "선택 번호", "설문 ID"] },
  polls:   { name: "설문기록", header: ["숨긴 시각", "설문 ID", "제목", "보기", "득표"] },
  apply:   { name: "수강신청", header: ["시각"] },
  attend:  { name: "출석",     header: ["시각", "학번", "이름", "주차", "날짜"] },
  submit:  { name: "과제제출", header: ["시각", "학번", "이름", "주차", "파일명", "크기(byte)", "지각", "파일 링크"] }
};

/* 처음 한 번 실행: 시트 탭 만들기 */
function setup() {
  Object.keys(SHEETS).forEach(function (k) { sheet_(k); });
  secret_();
}

/* ---------- 웹 요청 처리 ---------- */
function doGet() {
  return out_({ ok: true, message: "수업 사이트 백엔드가 동작 중입니다." });
}

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); }
  catch (err) { return out_({ ok: false, error: "잘못된 요청입니다." }); }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var fn = ACTIONS[req.action];
    if (!fn) throw new Error("알 수 없는 요청입니다.");
    var res = fn(req) || {};
    res.ok = true;
    return out_(res);
  } catch (err) {
    return out_({ ok: false, error: err.message });
  } finally {
    lock.releaseLock();
  }
}

var ACTIONS = {
  /* 투표 결과 */
  getVotes: function (req) {
    var n = Math.max(1, Math.min(50, Number(req.n) || 1));
    var counts = [];
    for (var i = 0; i < n; i++) counts.push(0);
    var mine = null;
    var pid = String(req.pid || "");
    rows_("votes").forEach(function (r) {
      if (String(r[3] || "") !== pid) return;          // 같은 설문의 투표만 셈
      var opt = Number(r[2]);
      if (opt >= 0 && opt < n) counts[opt]++;
      if (String(r[1]) === String(req.voterId)) mine = opt;
    });
    return { counts: counts, mine: mine, hidden: pollHidden_(pid) };
  },

  /* 투표하기 (한 사람당 1표, 다시 투표하면 변경) */
  vote: function (req) {
    var n = Number(req.n) || 1;
    var opt = Number(req.option);
    var pid = String(req.pid || "");
    if (!(opt >= 0 && opt < n) || !req.voterId) throw new Error("올바르지 않은 투표입니다.");
    if (pollHidden_(pid)) throw new Error("지금은 참여할 수 없는 설문입니다.");
    var sh = sheet_("votes");
    var data = sh.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(req.voterId) && String(data[i][3] || "") === pid) {
        sh.getRange(i + 1, 1, 1, 4).setValues([[now_(), req.voterId, opt, pid]]);
        return ACTIONS.getVotes(req);
      }
    }
    sh.appendRow([now_(), req.voterId, opt, pid]);
    return ACTIONS.getVotes(req);
  },

  /* 수강 신청서 */
  apply: function (req) {
    var d = req.data || {};
    var sh = sheet_("apply");
    var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    Object.keys(d).forEach(function (k) {             // 새 항목이면 열 추가
      if (header.indexOf(k) === -1) { header.push(k); sh.getRange(1, header.length).setValue(k); }
    });
    var sidCol = header.indexOf("sid");
    if (d.sid && sidCol > -1) {
      var dup = rows_("apply").some(function (r) { return String(r[sidCol]) === String(d.sid); });
      if (dup) throw new Error("이미 이 학번으로 신청서를 제출했습니다.");
    }
    sh.appendRow(header.map(function (h, i) { return i === 0 ? now_() : (d[h] == null ? "" : String(d[h])); }));
    return {};
  },

  /* 로그인: 명단의 학번 · 이름 · PIN 확인 */
  login: function (req) {
    var r = roster_(req.sid);
    if (!r || String(r[1]).trim() !== String(req.name).trim() || String(r[2]).trim() !== String(req.pin).trim()) {
      throw new Error("학번, 이름 또는 비밀번호가 맞지 않습니다.");
    }
    return { sid: String(r[0]).trim(), name: String(r[1]).trim(), token: token_(r[0]) };
  },

  /* 내 출석 · 제출 내역 */
  status: function (req) {
    auth_(req);
    var attendance = {};
    rows_("attend").forEach(function (r) {
      if (String(r[1]) === String(req.sid)) attendance[r[3]] = iso_(r[0]);
    });
    var submissions = rows_("submit")
      .filter(function (r) { return String(r[1]) === String(req.sid); })
      .map(function (r) { return { at: iso_(r[0]), week: Number(r[3]), fileName: r[4], size: Number(r[5]), late: r[6] === "지각", url: r[7] }; });
    return { attendance: attendance, submissions: submissions };
  },

  /* 출석 체크: 오늘(한국 시간)이 수업일일 때만 */
  attend: function (req) {
    var me = auth_(req);
    var today = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");
    if (req.date !== today || (CLASS_DATES.length && CLASS_DATES.indexOf(today) === -1)) {
      throw new Error("오늘은 출석 체크를 할 수 있는 수업일이 아닙니다.");
    }
    var done = rows_("attend").some(function (r) { return String(r[1]) === String(req.sid) && String(r[3]) === String(req.week); });
    if (done) throw new Error("이미 출석했습니다.");
    sheet_("attend").appendRow([now_(), req.sid, me[1], req.week, today]);
    return { at: new Date().toISOString() };
  },

  /* 과제 파일 제출 → 드라이브 폴더에 저장 */
  submit: function (req) {
    var me = auth_(req);
    if (!req.data || !req.fileName) throw new Error("파일이 없습니다.");
    var bytes = Utilities.base64Decode(req.data);
    if (bytes.length > MAX_FILE_MB * 1024 * 1024) throw new Error("파일이 너무 큽니다 (" + MAX_FILE_MB + "MB 이하).");
    var safe = String(req.fileName).replace(/[\\\/:*?"<>|]/g, "_");
    var blob = Utilities.newBlob(bytes, req.mimeType || "application/octet-stream",
      req.week + "주차_" + req.sid + "_" + me[1] + "_" + safe);
    var folder = DRIVE_FOLDER_ID ? DriveApp.getFolderById(DRIVE_FOLDER_ID) : DriveApp.getRootFolder();
    var file = folder.createFile(blob);
    sheet_("submit").appendRow([now_(), req.sid, me[1], req.week, req.fileName, bytes.length, req.late ? "지각" : "", file.getUrl()]);
    return {};
  },

  /* 공지 (누구나 읽기) */
  getNotices: function () {
    return {
      notices: rows_("notices").map(function (r) {
        return { date: r[0] instanceof Date ? Utilities.formatDate(r[0], TIMEZONE, "yyyy-MM-dd") : String(r[0]), title: String(r[1]), body: String(r[2]), important: r[3] === true || r[3] === "중요", eventId: String(r[4] || "") };
      })
    };
  },

  /* 달력 일정 (누구나 읽기) */
  getEvents: function () {
    return {
      events: rows_("events").map(function (r) {
        return {
          id: String(r[0]), date: r[1] instanceof Date ? Utilities.formatDate(r[1], TIMEZONE, "yyyy-MM-dd") : String(r[1]),
          time: r[2] instanceof Date ? Utilities.formatDate(r[2], TIMEZONE, "HH:mm") : String(r[2] || ""),
          title: String(r[3]), body: String(r[4] || ""), popup: r[5] === "팝업", notice: r[6] === "공지"
        };
      })
    };
  },

  /* ----- 아래는 관리자만 ----- */
  adminLogin: function (req) {
    if (sha256Hex_(ADMIN_SALT + "::" + String(req.password || "")) !== ADMIN_HASH) throw new Error("관리자 비밀번호가 맞지 않습니다. (Apps Script 의 ADMIN_HASH 확인)");
    return { adminToken: token_("__admin__") };
  },

  adminData: function (req) {
    admin_(req);
    var applyHeader = sheet_("apply").getRange(1, 1, 1, sheet_("apply").getLastColumn()).getValues()[0];
    var names = {};
    var roster = rows_("roster").map(function (r) { names[String(r[0])] = String(r[1]); return { sid: String(r[0]), name: String(r[1]), pin: String(r[2]) }; });
    return {
      roster: roster,
      applications: rows_("apply").map(function (r) {
        var o = { at: iso_(r[0]) };
        applyHeader.forEach(function (h, i) { if (i > 0) o[h] = r[i]; });
        return o;
      }),
      attendance: rows_("attend").map(function (r) { return { at: iso_(r[0]), sid: String(r[1]), name: String(r[2]), week: Number(r[3]) }; }),
      submissions: rows_("submit").map(function (r) {
        return { at: iso_(r[0]), sid: String(r[1]), name: String(r[2]), week: Number(r[3]), fileName: r[4], size: Number(r[5]), late: r[6] === "지각", url: r[7] };
      })
    };
  },

  saveRoster: function (req) {
    admin_(req);
    var list = (req.roster || []).filter(function (r) { return r.sid && r.name; });
    // 학번·PIN 이 숫자로 바뀌어 앞자리 0 이 사라지지 않도록 먼저 글자 형식으로
    sheet_("roster").getRange("A:C").setNumberFormat("@");
    replaceRows_("roster", list.map(function (r) { return [String(r.sid), String(r.name), String(r.pin)]; }));
    return {};
  },

  saveNotices: function (req) {
    admin_(req);
    replaceRows_("notices", (req.notices || []).map(function (n) {
      return [String(n.date || ""), String(n.title || ""), String(n.body || ""), n.important ? "중요" : "", String(n.eventId || "")];
    }));
    return {};
  },

  saveEvents: function (req) {
    admin_(req);
    sheet_("events").getRange("A:G").setNumberFormat("@");   // 날짜·시간이 자동 변환되지 않게
    replaceRows_("events", (req.events || []).map(function (e) {
      return [String(e.id || ""), String(e.date || ""), String(e.time || ""), String(e.title || ""), String(e.body || ""), e.popup ? "팝업" : "", e.notice ? "공지" : ""];
    }));
    return {};
  },

  /* 설문 숨기기: 그 시점의 결과를 '설문기록' 탭에 남김 */
  hidePoll: function (req) {
    admin_(req);
    var p = req.poll || {};
    if (!p.pid) throw new Error("설문 정보가 없습니다.");
    if (pollHidden_(p.pid)) return {};
    var opts = p.options || [];
    var counts = ACTIONS.getVotes({ pid: p.pid, n: opts.length }).counts;
    sheet_("polls").appendRow([now_(), String(p.pid), String(p.title || ""), JSON.stringify(opts), JSON.stringify(counts)]);
    return {};
  },

  /* 숨긴 설문 다시 보이기 */
  showPoll: function (req) {
    admin_(req);
    var sh = sheet_("polls");
    var data = sh.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][1]) === String(req.pid)) sh.deleteRow(i + 1);
    }
    return {};
  },

  /* 설문 히스토리 */
  pollHistory: function (req) {
    admin_(req);
    return {
      history: rows_("polls").map(function (r) {
        var opts = [], counts = [];
        try { opts = JSON.parse(r[3]); counts = JSON.parse(r[4]); } catch (e) {}
        return { hiddenAt: iso_(r[0]), pid: String(r[1]), title: String(r[2]), options: opts, counts: counts };
      })
    };
  }
};

/* ---------- 도우미 ---------- */
function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function sheet_(key) {
  var conf = SHEETS[key];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(conf.name);
  if (!sh) {
    sh = ss.insertSheet(conf.name);
    sh.appendRow(conf.header);
    sh.setFrozenRows(1);
  }
  return sh;
}
function rows_(key) {
  var v = sheet_(key).getDataRange().getValues();
  v.shift();
  return v;
}
function now_() { return Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss"); }
function iso_(v) {
  if (v instanceof Date) return v.toISOString();
  var d = new Date(String(v).replace(" ", "T") + "+09:00");
  return isNaN(d) ? String(v) : d.toISOString();
}
function roster_(sid) {
  return rows_("roster").filter(function (r) { return String(r[0]).trim() === String(sid).trim(); })[0] || null;
}
function secret_() {
  var p = PropertiesService.getScriptProperties();
  var s = p.getProperty("SECRET");
  if (!s) { s = Utilities.getUuid(); p.setProperty("SECRET", s); }
  return s;
}
function token_(sid) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(sid).trim(), secret_()));
}
function admin_(req) {
  if (!req.adminToken || req.adminToken !== token_("__admin__")) throw new Error("관리자 로그인이 필요합니다.");
}
function sha256Hex_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(function (b) { return ("0" + (b & 0xff).toString(16)).slice(-2); }).join("");
}
function replaceRows_(key, values) {
  var sh = sheet_(key);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
  if (values.length) sh.getRange(2, 1, values.length, values[0].length).setValues(values);
}
function pollHidden_(pid) {
  return rows_("polls").some(function (r) { return String(r[1]) === String(pid); });
}
function auth_(req) {
  if (!req.sid || req.token !== token_(req.sid)) throw new Error("로그인이 필요합니다. 다시 로그인해 주세요.");
  var r = roster_(req.sid);
  if (!r) throw new Error("명단에 없는 학번입니다. 다시 로그인해 주세요.");
  return r;
}
