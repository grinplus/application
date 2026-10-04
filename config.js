/* =========================================================
   사이트 설정 파일 (이 파일 하나만 고치면 사이트 내용이 바뀝니다)
   ---------------------------------------------------------
   - 글자는 따옴표 "..." 안에서 고치면 됩니다.
   - 항목을 추가하려면 { ... } 묶음을 복사해 쉼표(,)로 이어 붙이세요.
   - 메뉴(menu)의 id 는 아래 각 섹션의 id 와 같아야 해당 위치로 이동합니다.
   - order 에서 순서를 바꾸거나 이름을 지우면 섹션 순서/표시가 바뀝니다.
   - 날짜는 "2026-09-01", 날짜+시간은 "2026-09-07 23:59" 형식으로 적습니다.
   ========================================================= */
window.SITE_CONFIG = {
  /* ---------- 기본 정보 ---------- */
  site: {
    title: "AI와 영어교육",
    version: "v1.0.0",               // 상단 제목 오른쪽에 빨간 글씨로 표시 (비우면 숨김)
    footer: "© 2026 읽기쓰기 프로그램 · AI와 영어교육"
  },

  /* ---------- 상단 메뉴 (id = 이동할 섹션) ---------- */
  menu: [
    { id: "hero",       label: "강의 소개" },
    { id: "notices",    label: "공지" },
    { id: "curriculum", label: "주차별 강의" },
    { id: "calendar",   label: "수업 달력" },
    { id: "vote",       label: "주제 투표" },
    { id: "apply",      label: "수강 신청" },
    { id: "student",    label: "출석·과제" },
    { id: "readings",   label: "Reading" },
    { id: "quiz",       label: "문제풀이" },
    { id: "instructor", label: "교수자" }
  ],

  /* ---------- 첫 화면 아래 섹션 순서 ---------- */
  //  (교수자 소개는 항상 맨 아래 푸터에 붙습니다)
  order: ["info", "notices", "stats", "strengths", "curriculum", "calendar", "vote", "apply", "student", "tools", "prepare", "readings", "quiz", "faq", "infographic"],

  /* ---------- 관리자 ----------
     비밀번호는 그대로 적지 않고 '해시값'으로만 저장합니다.
     비밀번호 변경은 관리자 화면 → [설정 파일] 탭에서 하세요. (기본 비밀번호는 안내서 참고)  */
  admin: {
    salt: "rw-2026",
    passwordHash: "66be70f79fa4b7469c43b9e9c3fd7db4742d663e11b45f70c38b37929a0782a3"
  },

  /* ---------- 공지사항 ----------
     체험 모드에서는 아래 items 가 처음 공지로 보이고, 관리자 화면에서 올린 공지가 더해집니다.
     실제 운영 모드에서는 관리자 화면에서 올린 공지가 구글 시트에 저장되어 모두에게 보입니다.  */
  notices: {
    id: "notices",
    title: "공지사항",
    lead: "수업 관련 소식을 확인하세요.",
    items: [
      { date: "2026-10-02", title: "6주차 수업 준비물 안내", body: "10월 6일(화) 수업에서는 그래픽 오거나이저 실습을 합니다.\n노트북과 교과서 지문 1개를 꼭 준비해 주세요.", important: true },
      { date: "2026-09-25", title: "5주차 과제 마감 안내", body: "Pre-reading·어휘 활동지 과제는 10월 5일(월) 23:59까지 '출석·과제' 메뉴에서 제출해 주세요.", important: false }
    ]
  },

  /* ---------- 데이터 저장 방식 ----------
     url 을 비워 두면 '체험 모드' : 투표·신청·출석·제출이 이 브라우저에만 저장됩니다.
     실제 수업에서 쓰려면 backend 폴더의 google-apps-script.gs 안내에 따라
     구글 시트/드라이브와 연결한 뒤, 발급된 웹 앱 주소를 url 에 붙여 넣으세요.      */
  backend: {
    url: ""
  },

  /* ---------- 첫 방문 안내 팝업 ---------- */
  popup: {
    enabled: true,
    delaySeconds: 2,                 // 사이트에 들어오고 몇 초 뒤에 뜰지
    badge: "수강 신청 안내",
    title: "추가 수강 신청 접수 중",
    text: "AI와 영어교육 · 읽기 전략 강의의 추가 수강 신청을 받고 있습니다.",
    points: [
      "신청 기간: 2026. 9. 28 ~ 10. 9",
      "잔여 정원: 5명 (선착순 마감)",
      "매주 화요일 14:00 ~ 15:50"
    ],
    button: { label: "수강 신청하러 가기", target: "apply" }
  },

  /* ---------- 수업 일정 (주차별 날짜·달력이 여기서 자동 계산됩니다) ----------
     startDate : 1주차 수업 날짜 (화요일). 이후 매주 7일씩 더해집니다.
     holidays  : 휴강일. 수업일이 겹치면 그 주는 건너뛰고 다음 주로 밀립니다.
                 예) { date: "2026-10-06", name: "개교기념일 휴강" }
     submitLink: 외부 과제 제출 주소 (비워 두면 사이트의 '출석·과제' 제출 화면으로 이동)
     place     : 수업 방식 표시 (온라인 수업)
     onlineLink: 온라인 수업 입장 주소 (Zoom 등). 적으면 주차별 강의·달력에 '수업 입장' 버튼이 생깁니다. */
  schedule: {
    startDate: "2026-09-01",
    time: "14:00 ~ 15:50",
    place: "온라인 실시간 (Zoom)",
    onlineLink: "",
    holidays: [],
    submitLink: ""
  },

  /* ---------- 첫 화면(히어로) ---------- */
  hero: {
    // image: 과목명 앞(PC 왼쪽 · 휴대폰 위)에 들어가는 그림. 비우면 그림 없이 표시됩니다.
    image: "images/hero.jpg",
    imageAlt: "AI와 사람이 함께하는 언어 학습 일러스트",
    badge: "2026 읽기쓰기 프로그램",
    title: "AI와 영어교육",
    subtitle: "읽기 전략",
    text: "영어 텍스트를 훑고, 깊이 이해하고, 비판적으로 읽는 전략을 배우고, AI 도구로 영어 읽기 수업을 직접 설계해 봅니다. 15주 동안 '영어를 잘 읽는 사람'에서 '영어 읽기를 잘 가르치는 사람'으로 성장합니다.",
    // link 를 비워 두면 사이트 안의 수강 신청서로 이동합니다 (외부 신청 페이지가 있으면 주소 입력)
    applyButton: { label: "수강 신청", link: "" },
    curriculumButton: { label: "커리큘럼 보기", target: "curriculum" }
  },

  /* ---------- 강의 개요 (일정·시간·방식·대상) ---------- */
  info: {
    id: "info",
    items: [
      { icon: "📅", label: "일정",     value: "2026. 9. 1 ~ 12. 8", sub: "매주 화요일 · 15주" },
      { icon: "⏰", label: "시간",     value: "14:00 ~ 15:50",       sub: "주 1회 100분" },
      { icon: "💻", label: "수업 방식", value: "100% 온라인",         sub: "Zoom 실시간 수업 + AI 실습" },
      { icon: "🎓", label: "수강 대상", value: "영어교육 전공 학부생",  sub: "예비 영어교사 · 관심 있는 학생 누구나" }
    ]
  },

  /* ---------- 숫자 통계 카드 ---------- */
  stats: {
    id: "stats",
    title: "숫자로 보는 강의",
    lead: "탄탄한 과정과 경험으로 수업을 설계했습니다.",
    items: [
      { value: 15, suffix: "주",   label: "체계적인 과정" },
      { value: 6,  suffix: "개",   label: "실습 AI 도구" },
      { value: 15, suffix: "년+",  label: "ESL·EFL 강의 경력" }
    ]
  },

  /* ---------- 강의의 장점 (좌우 슬라이드) ---------- */
  strengths: {
    id: "strengths",
    title: "이 강의의 장점",
    lead: "옆으로 넘겨 보세요.",
    items: [
      { icon: "🧭", title: "검증된 영어 읽기 전략", text: "스키마 활성화, Skimming·Scanning, 추론, 요약 등 읽기 전·중·후 전략을 이론과 함께 익힙니다." },
      { icon: "🤖", title: "AI 실습 중심",         text: "AI로 수준별 읽기 자료와 문항을 만들고, 그 결과를 교사의 눈으로 검증하는 실습을 매주 합니다." },
      { icon: "🏫", title: "수업 설계까지",         text: "배운 전략을 실제 중·고등학교 영어 읽기 수업안으로 설계하고 시연해 봅니다." },
      { icon: "💬", title: "소그룹 피드백",         text: "동료 시연과 교수자 피드백으로 나의 수업 설계를 객관적으로 다듬습니다." },
      { icon: "✍️", title: "읽기에서 쓰기로",       text: "Reading-to-Write 통합 활동으로 읽기 지도를 쓰기 지도와 자연스럽게 연결합니다." },
      { icon: "📈", title: "성장 포트폴리오",       text: "15주간의 활동지·수업안·성찰을 포트폴리오로 모아 임용·현장 준비에 활용합니다." }
    ]
  },

  /* ---------- 주차별 강의 (15주) ----------
     title      : 주차 제목          summary : 한 줄 요약
     contents   : 학습 내용 목록     videos  : 참고 영상 [{ title, url }]
     assignment : 과제가 있는 주만 적습니다
                  { title, desc, due: "YYYY-MM-DD HH:MM", submit: "제출 주소(선택)" }
     date / time / place 를 적으면 그 주만 자동 일정 대신 그 값이 쓰입니다.
     ※ 참고 영상은 예시로 YouTube 검색 링크를 넣어 두었습니다. 실제 영상 주소로 바꿔 주세요. */
  curriculum: {
    id: "curriculum",
    title: "주차별 강의",
    lead: "주차를 누르면 일정, 학습 내용, 참고 영상, 과제를 볼 수 있습니다.",
    weeks: [
      {
        title: "오리엔테이션: AI 시대의 영어 읽기 교육",
        summary: "강의 소개와 나의 영어 읽기 경험 돌아보기",
        contents: ["강의 목표·평가 방법 안내", "AI가 바꾸는 영어 읽기 교육의 모습", "나의 영어 읽기 경험 공유"],
        videos: [{ title: "AI in English language teaching", url: "https://www.youtube.com/results?search_query=AI+in+English+language+teaching" }],
        assignment: { title: "영어 읽기 자기진단지", desc: "배부한 진단지를 작성하고, 나의 영어 읽기 강점·약점을 한 문단으로 정리해 제출하세요.", due: "2026-09-07 23:59" }
      },
      {
        title: "영어 읽기 과정의 이해",
        summary: "상향식·하향식·상호작용 모형",
        contents: ["Bottom-up / Top-down / Interactive 모형 비교", "L2 읽기의 특징과 어려움", "모형별 수업 활동 예시 분석"],
        videos: [{ title: "Bottom-up and top-down reading", url: "https://www.youtube.com/results?search_query=bottom-up+top-down+reading+model" }]
      },
      {
        title: "스키마 활성화와 예측하기",
        summary: "Pre-reading 전략",
        contents: ["스키마 이론과 배경지식의 역할", "제목·그림으로 내용 예측하기", "AI로 Pre-reading 질문 만들기 실습"],
        videos: [{ title: "Pre-reading activities", url: "https://www.youtube.com/results?search_query=pre-reading+activities+ESL" }]
      },
      {
        title: "Skimming & Scanning",
        summary: "빠르게 읽고 필요한 정보 찾기",
        contents: ["Skimming과 Scanning의 차이", "시간 제한 읽기 활동 설계", "AI로 연습용 지문 만들기"],
        videos: [{ title: "Skimming and scanning", url: "https://www.youtube.com/results?search_query=skimming+and+scanning+reading+strategies" }]
      },
      {
        title: "어휘 학습 전략과 AI 어휘 도구",
        summary: "읽기를 돕는 어휘 지도",
        contents: ["문맥으로 의미 추측하기", "핵심 어휘 선정 기준", "AI·Quizlet으로 어휘 활동 만들기"],
        videos: [{ title: "Teaching vocabulary in context", url: "https://www.youtube.com/results?search_query=teaching+vocabulary+in+context+ESL" }],
        assignment: { title: "Pre-reading·어휘 활동지 만들기", desc: "고등학교 교과서 지문 하나를 골라 Pre-reading 질문 3개와 어휘 활동 1개를 만들어 제출하세요. AI를 사용했다면 프롬프트도 함께 적어 주세요.", due: "2026-10-05 23:59" }
      },
      {
        title: "텍스트 구조와 그래픽 오거나이저",
        summary: "글의 뼈대를 시각화하기",
        contents: ["비교·대조, 원인·결과, 문제·해결 구조", "그래픽 오거나이저 유형", "AI로 구조 분석 결과 검증하기"],
        videos: [{ title: "Graphic organizers for reading", url: "https://www.youtube.com/results?search_query=graphic+organizers+reading+comprehension" }]
      },
      {
        title: "추론과 질문 생성",
        summary: "While-reading 전략",
        contents: ["사실적·추론적·평가적 질문", "Think-aloud 시범 보이기", "AI가 만든 질문의 수준 평가하기"],
        videos: [{ title: "Making inferences in reading", url: "https://www.youtube.com/results?search_query=making+inferences+reading+lesson" }]
      },
      {
        title: "중간 점검: 읽기 수업 미니 시연",
        summary: "소그룹 10분 시연과 피드백",
        contents: ["소그룹 미니 수업 시연", "동료 피드백 루브릭 활용", "전반부 학습 성찰"],
        videos: [],
        assignment: { title: "중간 포트폴리오", desc: "1~7주 활동지와 미니 시연 수업안, 성찰문(A4 1쪽)을 하나의 파일로 묶어 제출하세요.", due: "2026-10-26 23:59" }
      },
      {
        title: "요약하기 전략과 AI 요약 비교",
        summary: "Post-reading 전략",
        contents: ["좋은 요약의 조건", "학생 요약 vs. AI 요약 비교", "요약 지도 활동 설계"],
        videos: [{ title: "Teaching summarizing", url: "https://www.youtube.com/results?search_query=teaching+summarizing+reading+strategy" }]
      },
      {
        title: "비판적 읽기와 AI 생성 텍스트 평가",
        summary: "주장·근거·편향 읽어내기",
        contents: ["Critical reading 질문 틀", "AI 생성 텍스트의 오류와 편향 찾기", "출처 확인 활동"],
        videos: [{ title: "Critical reading skills", url: "https://www.youtube.com/results?search_query=critical+reading+skills+ESL" }]
      },
      {
        title: "수준별 읽기 자료 만들기",
        summary: "AI로 텍스트 난이도 조정",
        contents: ["텍스트 난이도 지표 (어휘·문장 길이)", "AI로 같은 글을 3단계 수준으로 바꾸기", "원문 의미 보존 여부 검증"],
        videos: [{ title: "Differentiated reading texts with AI", url: "https://www.youtube.com/results?search_query=differentiated+reading+texts+AI" }],
        assignment: { title: "수준별 읽기 자료 세트", desc: "하나의 영어 지문을 AI로 상·중·하 3단계로 바꾸고, 각 수준의 차이와 검증 과정을 표로 정리해 제출하세요.", due: "2026-11-16 23:59" }
      },
      {
        title: "AI 기반 읽기 문항 제작과 검증",
        summary: "평가 문항 만들기",
        contents: ["좋은 읽기 문항의 조건", "AI로 객관식·서술형 문항 생성", "정답 시비·오류 검토 체크리스트"],
        videos: [{ title: "Writing reading comprehension questions", url: "https://www.youtube.com/results?search_query=writing+reading+comprehension+questions" }]
      },
      {
        title: "읽기-쓰기 통합 활동",
        summary: "Reading to Write",
        contents: ["읽기 후 쓰기 활동 유형", "요약문·반응글 쓰기 지도", "AI 피드백 활용과 한계"],
        videos: [{ title: "Integrating reading and writing", url: "https://www.youtube.com/results?search_query=integrating+reading+and+writing+ESL" }]
      },
      {
        title: "AI 활용 읽기 수업 설계 발표",
        summary: "최종 수업안 발표",
        contents: ["팀별 수업안 발표 (15분)", "질의응답과 동료 평가", "수업안 수정 방향 논의"],
        videos: [],
        assignment: { title: "AI 활용 영어 읽기 수업안", desc: "50분 분량의 영어 읽기 수업안(학습 목표·활동·AI 활용 방법·평가 포함)을 작성해 발표 전날까지 제출하세요.", due: "2026-11-30 23:59" }
      },
      {
        title: "최종 성찰과 포트폴리오",
        summary: "한 학기 정리",
        contents: ["포트폴리오 공유", "AI와 영어교육에 대한 나의 관점 정리", "강의 평가"],
        videos: [],
        assignment: { title: "최종 포트폴리오", desc: "학기 전체 활동지, 수정한 수업안, 최종 성찰문(A4 2쪽)을 묶어 제출하세요.", due: "2026-12-14 23:59" }
      }
    ]
  },

  /* ---------- 수업 달력 ---------- */
  calendar: {
    id: "calendar",
    title: "수업 달력",
    lead: "매주 화요일 수업이 자동으로 표시됩니다. 날짜를 누르면 그날 수업 내용이 나옵니다."
  },

  /* ---------- 실시간 주제 투표 ---------- */
  vote: {
    id: "vote",
    title: "가장 먼저 배우고 싶은 주제는?",
    lead: "하나를 골라 투표하세요. 결과는 바로 막대그래프로 보입니다. (다시 고르면 투표가 바뀝니다)",
    refreshSeconds: 10,              // 실제 운영 모드에서 결과를 새로 불러오는 간격
    options: [
      "Skimming & Scanning",
      "AI로 수준별 읽기 자료 만들기",
      "AI 기반 읽기 문항 제작",
      "비판적 읽기와 AI 텍스트 평가",
      "읽기-쓰기 통합 활동"
    ]
  },

  /* ---------- 수강 신청서 ----------
     type: text / email / tel / select / radio / textarea
     required: true 면 필수 항목 (비어 있으면 제출 시 알려 줌)
     pattern: 입력 형식 검사 (정규식), patternMessage: 형식이 틀렸을 때 안내 문구        */
  apply: {
    id: "apply",
    title: "수강 신청서",
    lead: "아래 항목을 작성해 제출해 주세요. * 표시는 필수 항목입니다.",
    fields: [
      { name: "name",    label: "이름",   type: "text",  required: true, placeholder: "홍길동" },
      { name: "sid",     label: "학번",   type: "text",  required: true, placeholder: "2026123456", pattern: "^[0-9]{6,10}$", patternMessage: "학번은 숫자 6~10자리로 입력해 주세요." },
      { name: "major",   label: "학과",   type: "text",  required: true, placeholder: "영어교육과" },
      { name: "year",    label: "학년",   type: "select", required: true, options: ["1학년", "2학년", "3학년", "4학년", "기타"] },
      { name: "email",   label: "이메일", type: "email", required: true, placeholder: "name@university.ac.kr" },
      { name: "phone",   label: "연락처", type: "tel",   required: false, placeholder: "010-0000-0000", pattern: "^[0-9\\-\\s]{9,13}$", patternMessage: "연락처는 숫자와 - 로 입력해 주세요." },
      { name: "level",   label: "나의 영어 읽기 수준", type: "radio", required: true, options: ["기초", "중급", "고급"] },
      { name: "motive",  label: "수강 동기", type: "textarea", required: true, placeholder: "이 강의에서 배우고 싶은 점을 자유롭게 적어 주세요." }
    ],
    consent: "수강 관리를 위한 개인정보(이름·학번·연락처) 수집·이용에 동의합니다.",
    successMessage: "수강 신청이 접수되었습니다. 확인 메일은 수업 시작 전에 보내 드립니다."
  },

  /* ---------- 수강생 공간: 로그인 · 출석 · 과제 제출 ----------
     로그인: 학번 + 이름 + 교수자가 안내한 비밀번호(PIN)
             (체험 모드에서는 아무 값이나 로그인됩니다)
     출석  : 수업이 있는 날(달력의 수업일)에만 체크할 수 있습니다.
     과제  : 위 '주차별 강의'에서 과제가 있는 주차가 자동으로 목록에 나옵니다.            */
  student: {
    id: "student",
    title: "출석 · 과제 제출",
    lead: "로그인하면 출석을 체크하고 과제 파일을 제출할 수 있습니다.",
    pinLabel: "비밀번호 (교수자 안내 4자리)",
    maxFileMB: 10,
    accept: ".pdf,.doc,.docx,.hwp,.hwpx,.ppt,.pptx,.zip,.jpg,.png",
    allowLate: false                 // true 면 마감 후에도 제출 가능 (지각 제출로 표시)
  },

  /* ---------- 실습 AI 도구 ---------- */
  tools: {
    id: "tools",
    title: "실습에 쓰는 AI 도구",
    lead: "모두 무료로 시작할 수 있습니다. 첫 수업 전에 가입해 두세요.",
    items: [
      { icon: "🟠", name: "Claude",      use: "자료·문항 제작",  text: "수준별 영어 지문과 읽기 문항을 만들고 다듬어 봅니다.",          link: "https://claude.ai" },
      { icon: "🟢", name: "ChatGPT",     use: "대화형 읽기",     text: "영어 지문에 대해 묻고 답하며 이해도와 질문 수준을 점검합니다.",   link: "https://chatgpt.com" },
      { icon: "📒", name: "NotebookLM",  use: "자료 기반 학습",   text: "Reading 자료를 올려 출처가 표시된 답변으로 이론을 정리합니다.",   link: "https://notebooklm.google.com" },
      { icon: "🌐", name: "DeepL",       use: "번역 비교",       text: "원문과 번역을 비교하며 의미 차이와 번역의 한계를 살펴봅니다.",   link: "https://www.deepl.com" },
      { icon: "🃏", name: "Quizlet",     use: "어휘 학습",       text: "핵심 어휘 세트를 만들어 어휘 활동에 활용합니다.",               link: "https://quizlet.com" },
      { icon: "🧩", name: "Padlet",      use: "협업 보드",       text: "소그룹 토론과 수업안 아이디어를 함께 정리하고 공유합니다.",       link: "https://padlet.com" }
    ]
  },

  /* ---------- 수강 준비물 ---------- */
  prepare: {
    id: "prepare",
    title: "수강 준비물",
    lead: "첫 수업 전에 아래 항목을 확인해 주세요.",
    items: [
      { icon: "💻", title: "노트북 또는 태블릿", text: "매 수업 온라인으로 AI 실습을 합니다. 휴대폰보다는 노트북을 권장합니다." },
      { icon: "🎧", title: "Zoom · 이어폰 · 마이크", text: "Zoom 을 미리 설치하고, 안정적인 인터넷 환경과 이어폰·마이크를 준비해 주세요." },
      { icon: "🔑", title: "AI 도구 계정",       text: "위의 AI 도구에 미리 가입해 두세요 (무료 계정이면 충분합니다)." },
      { icon: "📘", title: "중·고등 영어 교과서", text: "실습에 쓸 교과서 지문 1~2개를 골라 오세요 (PDF도 가능)." },
      { icon: "📚", title: "Reading 자료 예습",  text: "매주 Reading 자료를 수업 전에 읽어 오세요." }
    ]
  },

  /* ---------- Reading 자료 ---------- */
  readings: {
    id: "readings",
    title: "Reading 자료",
    lead: "수업 전에 읽어 오면 토론이 훨씬 풍성해집니다.",
    items: [
      { tag: "필수", title: "Teaching and Researching Reading", author: "William Grabe & Fredricka L. Stoller", summary: "L2 읽기의 이론과 연구, 교실 적용 방법을 폭넓게 다루는 핵심 교재입니다.", link: "" },
      { tag: "필수", title: "Teaching Reading Skills in a Foreign Language", author: "Christine Nuttall", summary: "외국어 읽기 기술을 단계별로 지도하는 방법을 실제 활동과 함께 소개합니다.", link: "" },
      { tag: "참고", title: "AI 활용 영어 읽기 수업 자료집", author: "수업 자료", summary: "주차별 실습 안내와 프롬프트 예시를 모은 자료집입니다.", link: "" }
    ]
  },

  /* ---------- 문제풀이 ----------
     type: "choice" (객관식) 또는 "short" (단답형)
     객관식 answer = 정답 보기 번호(0부터 시작)
     단답형 answer = 정답으로 인정할 단어 목록           */
  quiz: {
    id: "quiz",
    title: "문제풀이",
    lead: "답을 고른 뒤 '정답 확인'을 눌러 보세요.",
    questions: [
      {
        type: "choice",
        question: "글의 요지를 빠르게 파악하기 위해 제목·첫 문장·마지막 문장 위주로 읽는 전략은?",
        options: ["Scanning", "Skimming", "Intensive reading", "Reading aloud"],
        answer: 1,
        explain: "Skimming은 세부 내용보다 글의 전체 흐름과 요지를 빠르게 파악하는 전략입니다."
      },
      {
        type: "choice",
        question: "읽기 전에 학습자의 배경지식을 끌어내는 활동의 이론적 근거가 되는 것은?",
        options: ["스키마 이론", "행동주의 이론", "대조분석 가설", "입력 가설"],
        answer: 0,
        explain: "스키마 이론은 독자의 배경지식(스키마)이 텍스트 이해에 큰 영향을 준다고 봅니다."
      },
      {
        type: "choice",
        question: "AI로 만든 수준별 읽기 지문을 수업에 쓰기 전에 교사가 꼭 해야 할 일은?",
        options: ["가장 짧은 버전만 사용한다", "원문과 대조해 의미 왜곡·오류가 없는지 검토한다", "AI가 만들었으니 그대로 쓴다", "학생에게 직접 고치게 한다"],
        answer: 1,
        explain: "AI는 난이도를 낮추면서 내용을 바꾸거나 틀리게 쓸 수 있으므로 교사의 검증이 필수입니다."
      },
      {
        type: "short",
        question: "지문에서 특정 정보(날짜, 이름 등)만 빠르게 찾아 읽는 전략은? (영어 한 단어)",
        answer: ["scanning"],
        explain: "Scanning은 필요한 특정 정보를 찾기 위해 글을 훑는 전략입니다."
      }
    ]
  },

  /* ---------- 자주 묻는 질문 ---------- */
  faq: {
    id: "faq",
    title: "자주 묻는 질문",
    lead: "궁금한 질문을 눌러 답변을 확인하세요.",
    items: [
      { q: "수업은 어디에서 하나요?",                     a: "모든 수업은 온라인(Zoom 실시간)으로만 진행합니다. 입장 주소는 주차별 강의와 수업 달력에서 확인할 수 있습니다." },
      { q: "AI 도구를 처음 써 보는데 따라갈 수 있을까요?", a: "네. 첫 2주 동안 도구 사용법을 함께 익히며, 모든 실습은 단계별 안내와 함께 진행됩니다." },
      { q: "영어교육 전공이 아니어도 들을 수 있나요?",     a: "네. 영어 읽기 지도에 관심 있는 학생이라면 누구나 수강할 수 있습니다." },
      { q: "유료 AI 계정이 필요한가요?",                a: "아니요. 모든 실습은 무료 계정으로 가능하도록 설계했습니다." },
      { q: "성적은 어떻게 평가하나요?",                 a: "수업 참여(문제풀이·토론) 20%, 주차별 과제 30%, 수업안 발표 20%, 최종 포트폴리오 30%로 평가합니다." },
      { q: "결석하면 수업 내용을 어떻게 확인하나요?",    a: "'주차별 강의'에서 학습 내용과 참고 영상을 확인할 수 있습니다. 실습 과제는 교수자에게 이메일로 문의하세요." },
      { q: "출석은 어떻게 하나요?",                     a: "수업 당일 Zoom 에 들어온 뒤, 이 사이트의 '출석·과제' 메뉴에서 로그인하고 '지금 출석하기'를 눌러 주세요." }
    ]
  },

  /* ---------- 프로그램 한눈에 보기 (인포그래픽) ----------
     facts      : 맨 위 핵심 숫자            phases  : 15주 학습 여정 (from~to = 주차 범위)
     session    : 한 번의 수업 구성 (분)     assessment : 평가 비율 (합계 100)
     outcomes   : 수강 후 할 수 있게 되는 것                                              */
  infographic: {
    id: "infographic",
    title: "프로그램 한눈에 보기",
    lead: "AI와 영어교육 · 읽기 전략 프로그램의 흐름을 한 장으로 정리했습니다.",
    facts: [
      { icon: "🗓️", value: "15주",      label: "매주 화요일 100분" },
      { icon: "💻", value: "100%",      label: "온라인 실시간 (Zoom)" },
      { icon: "🤖", value: "6개",       label: "실습 AI 도구" },
      { icon: "📝", value: "6회",       label: "주차별 과제" },
      { icon: "🎤", value: "2회",       label: "수업 시연 · 발표" }
    ],
    phases: [
      { from: 1,  to: 4,  icon: "🧭", title: "기초 다지기",   items: ["영어 읽기 과정 이해", "스키마 활성화 · 예측", "Skimming & Scanning"] },
      { from: 5,  to: 8,  icon: "🔍", title: "전략 익히기",   items: ["어휘 · 텍스트 구조", "추론과 질문 생성", "8주차 미니 수업 시연"] },
      { from: 9,  to: 12, icon: "🤖", title: "AI와 실습하기", items: ["AI 요약 비교", "AI 텍스트 비판적 읽기", "수준별 자료 · 문항 제작"] },
      { from: 13, to: 15, icon: "🏫", title: "수업 설계하기", items: ["읽기-쓰기 통합 활동", "AI 활용 수업안 발표", "최종 포트폴리오"] }
    ],
    sessionTitle: "한 번의 수업은 이렇게 진행돼요 (100분)",
    session: [
      { label: "개념 강의",    minutes: 30 },
      { label: "AI 실습",      minutes: 40 },
      { label: "소그룹 토론",  minutes: 20 },
      { label: "정리 · 출석",  minutes: 10 }
    ],
    assessmentTitle: "평가 비율",
    assessment: [
      { label: "수업 참여",       percent: 20 },
      { label: "주차별 과제",     percent: 30 },
      { label: "수업안 발표",     percent: 20 },
      { label: "최종 포트폴리오", percent: 30 }
    ],
    outcomesTitle: "수강 후에는 이렇게 할 수 있어요",
    outcomes: [
      "영어 읽기 전·중·후 전략을 설명하고 시범 보일 수 있다",
      "AI로 수준별 읽기 자료와 문항을 만들고 검증할 수 있다",
      "AI를 활용한 50분 영어 읽기 수업을 설계할 수 있다"
    ]
  },

  /* ---------- 교수자 프로필 (페이지 맨 아래 푸터에 표시 · 영어로 작성) ----------
     photo: class-site 폴더 안에 images 폴더를 만들고 사진을 넣은 뒤 경로를 적어 주세요.
            사진이 없으면 이름 첫 글자가 표시됩니다.
     bioLabel / careerLabel : 소개·경력 위에 붙는 작은 제목
     office : 상담 안내 (비우면 표시 안 함)                                               */
  instructor: {
    title: "Instructor Profile",
    lead: "Feel free to reach out with any questions.",
    photo: "images/instructor.svg",
    name: "Catherine Kim",
    bioLabel: "About",
    bio: "I have been teaching English in ESL and EFL contexts for over 15 years. My areas of expertise are multimodality, Computer-Assisted Language Learning (CALL), and language education. I also serve on the editorial board of Cogent Education. My goal is to help future English teachers use AI thoughtfully and critically in their own classrooms.",
    careerLabel: "Experience",
    career: [
      "Expertise: Multimodality, Computer-Assisted Language Learning (CALL), and Language Education",
      "15+ years of teaching in ESL and EFL contexts",
      "Serving on the editorial board of Cogent Education"
    ],
    email: "professor@university.ac.kr",
    office: "Office hours: online (Zoom) by appointment via email"
  }
};
