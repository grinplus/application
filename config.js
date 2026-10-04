/* =========================================================
   사이트 설정 파일 (이 파일 하나만 고치면 사이트 내용이 바뀝니다)
   ---------------------------------------------------------
   - 글자는 따옴표 "..." 안에서 고치면 됩니다.
   - 항목을 추가하려면 { ... } 묶음을 복사해 쉼표(,)로 이어 붙이세요.
   - 메뉴(menu)의 id 는 아래 각 섹션의 id 와 같아야 해당 위치로 이동합니다.
   - order 에서 순서를 바꾸거나 이름을 지우면 섹션 순서/표시가 바뀝니다.
   - 날짜는 "2026-09-01", 날짜+시간은 "2026-09-07 23:59" 형식으로 적습니다.
   - 수강생에게 보이는 글은 모두 영어로 작성합니다.
   ========================================================= */
window.SITE_CONFIG = {
  /* ---------- 기본 정보 ---------- */
  site: {
    title: "AI & English Language Education",
    version: "v1.3.0",               // 상단 제목 오른쪽에 회색 글씨로 표시 (비우면 숨김)
    footer: "© 2026 Reading & Writing Program · AI & English Language Education"
  },

  /* ---------- 상단 메뉴 (id = 이동할 섹션) ---------- */
  menu: [
    { id: "hero",       label: "About" },
    { id: "notices",    label: "Notices" },
    { id: "curriculum", label: "Weekly Lessons" },
    { id: "calendar",   label: "Calendar" },
    { id: "vote",       label: "Topic Poll" },
    { id: "apply",      label: "Enroll" },
    { id: "student",    label: "Attendance" },
    { id: "readings",   label: "Readings" },
    { id: "quiz",       label: "Quiz" },
    { id: "instructor", label: "Instructor" }
  ],

  /* ---------- 첫 화면 아래 섹션 순서 ---------- */
  //  (교수자 소개는 항상 맨 아래 푸터에 붙습니다)
  order: ["info", "notices", "stats", "strengths", "curriculum", "calendar", "vote", "apply", "student", "tools", "prepare", "readings", "quiz", "faq", "infographic"],

  /* ---------- 관리자 ----------
     비밀번호는 그대로 적지 않고 '해시값'으로만 저장합니다.
     비밀번호 변경은 관리자 화면 → [설정 파일] 탭에서 하세요.  */
  admin: {
    salt: "rw-kgm8yaqp",
    passwordHash: "4ca5d64092987fd20f541d6901b4fd5e733fde313a3154a7693f9978b25b446f"
  },

  /* ---------- 공지사항 ----------
     관리자 화면에서 공지를 한 번도 올리지 않았을 때 아래 items 가 기본 공지로 보입니다.
     운영 모드에서는 관리자 화면에서 올린 공지가 데이터베이스에 저장되어 모두에게 보입니다.  */
  notices: {
    id: "notices",
    title: "Notices",
    lead: "Check here for the latest class updates.",
    items: [
      { date: "2026-10-02", title: "What to prepare for Week 6", body: "In the class on Tuesday, October 6, we will practice using graphic organizers.\nPlease bring your laptop and one textbook passage.", important: true },
      { date: "2026-09-25", title: "Week 5 assignment deadline", body: "The Pre-reading & Vocabulary Worksheet is due Monday, October 5, at 23:59. Please submit it from the 'Attendance' menu.", important: false }
    ]
  },

  /* ---------- 데이터 저장 방식 ----------
     "/api" : 운영 모드 — 이 사이트의 서버(server.js)가 Railway PostgreSQL 에 저장합니다.
     url 을 비워 두면 '체험 모드' : 투표·신청·출석·제출이 이 브라우저에만 저장됩니다.
     (backend 폴더의 google-apps-script.gs 웹 앱 주소를 넣으면 구글 시트에 저장할 수도 있습니다) */
  backend: {
    url: "/api"
  },

  /* ---------- 첫 방문 안내 팝업 ---------- */
  popup: {
    enabled: true,
    delaySeconds: 2,                 // 사이트에 들어오고 몇 초 뒤에 뜰지
    badge: "Enrollment",
    title: "Late enrollment is open",
    text: "We are accepting additional students for AI & English Language Education · Reading and Writing.",
    points: [
      "Application period: Sep 28 – Oct 9, 2026",
      "Seats left: 5 (first come, first served)",
      "Every Tuesday, 14:00 – 15:50"
    ],
    button: { label: "Go to the enrollment form", target: "apply" }
  },

  /* ---------- 수업 일정 (주차별 날짜·달력이 여기서 자동 계산됩니다) ----------
     startDate : 1주차 수업 날짜 (화요일). 이후 매주 7일씩 더해집니다.
     holidays  : 휴강일. 수업일이 겹치면 그 주는 건너뛰고 다음 주로 밀립니다.
                 예) { date: "2026-10-06", name: "No class (University Foundation Day)" }
     submitLink: 외부 과제 제출 주소 (비워 두면 사이트의 '출석·과제' 제출 화면으로 이동)
     place     : 수업 방식 표시 (온라인 수업)
     onlineLink: 온라인 수업 입장 주소 (Zoom 등). 적으면 주차별 강의·달력에 '수업 입장' 버튼이 생깁니다. */
  schedule: {
    startDate: "2026-09-01",
    time: "14:00 – 15:50",
    place: "Live online (Zoom)",
    onlineLink: "",
    holidays: [],
    submitLink: ""
  },

  /* ---------- 첫 화면(히어로) ---------- */
  hero: {
    // image: 과목명 앞(PC 왼쪽 · 휴대폰 위)에 들어가는 그림. 비우면 그림 없이 표시됩니다.
    image: "images/hero.jpg",
    imageAlt: "Illustration of people and AI learning languages together",
    badge: "2026 Reading & Writing Program",
    title: "AI & English Language Education",
    subtitle: "Reading and Writing",
    text: "Learn strategies for skimming, understanding, and critically reading English texts, then design your own English reading lessons with AI tools. Over 15 weeks, you will grow from a good reader of English into a good teacher of English reading.",
    // link 를 비워 두면 사이트 안의 수강 신청서로 이동합니다 (외부 신청 페이지가 있으면 주소 입력)
    applyButton: { label: "Enroll", link: "" },
    curriculumButton: { label: "View curriculum", target: "curriculum" }
  },

  /* ---------- 강의 개요 (일정·시간·방식·대상) ---------- */
  info: {
    id: "info",
    items: [
      { icon: "📅", label: "Schedule", value: "Sep 1 – Dec 8, 2026", sub: "Every Tuesday · 15 weeks" },
      { icon: "⏰", label: "Time",     value: "14:00 – 15:50",       sub: "Once a week · 100 minutes" },
      { icon: "💻", label: "Format",   value: "100% online",         sub: "Live Zoom classes + AI practice" },
      { icon: "🎓", label: "For",      value: "English Education majors", sub: "Pre-service teachers · anyone interested" }
    ]
  },

  /* ---------- 숫자 통계 카드 ---------- */
  stats: {
    id: "stats",
    title: "The Course in Numbers",
    lead: "A carefully structured course built on years of teaching experience.",
    items: [
      { value: 15, suffix: " wks",  label: "Structured curriculum" },
      { value: 6,  suffix: "",      label: "AI tools for practice" },
      { value: 15, suffix: "+ yrs", label: "ESL/EFL teaching experience" }
    ]
  },

  /* ---------- 강의의 장점 (좌우 슬라이드) ---------- */
  strengths: {
    id: "strengths",
    title: "Why This Course",
    lead: "Swipe to see more.",
    items: [
      { icon: "🧭", title: "Proven reading strategies", text: "Learn pre-, while-, and post-reading strategies such as schema activation, skimming and scanning, inferencing, and summarizing, together with the theory behind them." },
      { icon: "🤖", title: "Hands-on AI practice",      text: "Every week, create leveled reading materials and test items with AI, and check the results through a teacher's eyes." },
      { icon: "🏫", title: "Real lesson design",        text: "Turn what you learn into actual middle and high school English reading lesson plans, and teach them in demo lessons." },
      { icon: "💬", title: "Small-group feedback",      text: "Refine your lesson designs with peer demos and instructor feedback." },
      { icon: "✍️", title: "From reading to writing",   text: "Connect reading instruction to writing instruction through Reading-to-Write activities." },
      { icon: "📈", title: "Growth portfolio",          text: "Collect 15 weeks of worksheets, lesson plans, and reflections into a portfolio you can use for teacher exams and the classroom." }
    ]
  },

  /* ---------- 주차별 강의 (15주) ----------
     title      : 주차 제목          summary : 한 줄 요약
     contents   : 학습 내용 목록     videos  : 참고 영상 [{ title, url }]
                  → YouTube 영상 주소(watch?v= · youtu.be · shorts)면 사이트 안에서 바로 재생됩니다
     materials  : 수업 자료 [{ title, url }] — Google Drive · Docs · Slides 공유 링크면 '미리보기'가 생깁니다
                  (드라이브 공유 설정을 '링크가 있는 모든 사용자 · 뷰어'로 해 주세요)
     assignment : 과제가 있는 주만 적습니다
                  { title, desc, due: "YYYY-MM-DD HH:MM", submit: "제출 주소(선택)" }
     date / time / place 를 적으면 그 주만 자동 일정 대신 그 값이 쓰입니다.
     ※ 관리자 모드에서는 사이트의 '주차별 강의'에서 바로 주차를 추가 · 수정 · 삭제할 수 있습니다.
     ※ 참고 영상은 예시로 YouTube 검색 링크를 넣어 두었습니다. 실제 영상 주소로 바꿔 주세요. */
  curriculum: {
    id: "curriculum",
    title: "Weekly Lessons",
    lead: "Open a week to see its schedule, topics, videos, and assignment.",
    weeks: [
      {
        title: "Orientation: Teaching English Reading in the Age of AI",
        summary: "Course overview and reflecting on your own reading experience",
        contents: ["Course goals and assessment", "How AI is changing English reading instruction", "Sharing our experiences as English readers"],
        videos: [{ title: "AI in English language teaching", url: "https://www.youtube.com/results?search_query=AI+in+English+language+teaching" }],
        assignment: { title: "English Reading Self-Assessment", desc: "Complete the self-assessment form and write one paragraph about your strengths and weaknesses as an English reader.", due: "2026-09-07 23:59" }
      },
      {
        title: "Understanding the Reading Process",
        summary: "Bottom-up, top-down, and interactive models",
        contents: ["Comparing bottom-up, top-down, and interactive models", "Features and challenges of L2 reading", "Analyzing classroom activities for each model"],
        videos: [{ title: "Bottom-up and top-down reading", url: "https://www.youtube.com/results?search_query=bottom-up+top-down+reading+model" }]
      },
      {
        title: "Activating Schema and Predicting",
        summary: "Pre-reading strategies",
        contents: ["Schema theory and the role of background knowledge", "Predicting content from titles and pictures", "Practice: creating pre-reading questions with AI"],
        videos: [{ title: "Pre-reading activities", url: "https://www.youtube.com/results?search_query=pre-reading+activities+ESL" }]
      },
      {
        title: "Skimming & Scanning",
        summary: "Reading quickly and finding information",
        contents: ["The difference between skimming and scanning", "Designing timed reading activities", "Creating practice passages with AI"],
        videos: [{ title: "Skimming and scanning", url: "https://www.youtube.com/results?search_query=skimming+and+scanning+reading+strategies" }]
      },
      {
        title: "Vocabulary Strategies and AI Vocabulary Tools",
        summary: "Teaching vocabulary that supports reading",
        contents: ["Guessing meaning from context", "Choosing key vocabulary", "Building vocabulary activities with AI and Quizlet"],
        videos: [{ title: "Teaching vocabulary in context", url: "https://www.youtube.com/results?search_query=teaching+vocabulary+in+context+ESL" }],
        assignment: { title: "Pre-reading & Vocabulary Worksheet", desc: "Choose one high school textbook passage and create three pre-reading questions and one vocabulary activity. If you used AI, include your prompts.", due: "2026-10-05 23:59" }
      },
      {
        title: "Text Structure and Graphic Organizers",
        summary: "Visualizing how a text is built",
        contents: ["Compare–contrast, cause–effect, and problem–solution structures", "Types of graphic organizers", "Checking AI's structure analysis"],
        videos: [{ title: "Graphic organizers for reading", url: "https://www.youtube.com/results?search_query=graphic+organizers+reading+comprehension" }]
      },
      {
        title: "Inferencing and Question Generation",
        summary: "While-reading strategies",
        contents: ["Literal, inferential, and evaluative questions", "Modeling a think-aloud", "Evaluating the quality of AI-generated questions"],
        videos: [{ title: "Making inferences in reading", url: "https://www.youtube.com/results?search_query=making+inferences+reading+lesson" }]
      },
      {
        title: "Midterm Check: Mini Reading Lesson Demos",
        summary: "10-minute small-group demos with feedback",
        contents: ["Small-group mini lesson demos", "Using a peer feedback rubric", "Reflecting on the first half of the course"],
        videos: [],
        assignment: { title: "Midterm Portfolio", desc: "Combine your Week 1–7 worksheets, your demo lesson plan, and a one-page reflection into a single file and submit it.", due: "2026-10-26 23:59" }
      },
      {
        title: "Summarizing Strategies and AI Summaries",
        summary: "Post-reading strategies",
        contents: ["What makes a good summary", "Student summaries vs. AI summaries", "Designing summary-writing activities"],
        videos: [{ title: "Teaching summarizing", url: "https://www.youtube.com/results?search_query=teaching+summarizing+reading+strategy" }]
      },
      {
        title: "Critical Reading and Evaluating AI-Generated Texts",
        summary: "Reading for claims, evidence, and bias",
        contents: ["A question framework for critical reading", "Finding errors and bias in AI-generated texts", "Source-checking activities"],
        videos: [{ title: "Critical reading skills", url: "https://www.youtube.com/results?search_query=critical+reading+skills+ESL" }]
      },
      {
        title: "Creating Leveled Reading Materials",
        summary: "Adjusting text difficulty with AI",
        contents: ["Measures of text difficulty (vocabulary, sentence length)", "Rewriting one text at three levels with AI", "Checking that the original meaning is kept"],
        videos: [{ title: "Differentiated reading texts with AI", url: "https://www.youtube.com/results?search_query=differentiated+reading+texts+AI" }],
        assignment: { title: "Leveled Reading Set", desc: "Use AI to rewrite one English passage at three levels (advanced, intermediate, basic). Summarize the differences between the levels and how you checked them in a table.", due: "2026-11-16 23:59" }
      },
      {
        title: "Creating and Checking AI-Based Reading Test Items",
        summary: "Writing assessment items",
        contents: ["What makes a good reading test item", "Generating multiple-choice and short-answer items with AI", "A checklist for answer disputes and errors"],
        videos: [{ title: "Writing reading comprehension questions", url: "https://www.youtube.com/results?search_query=writing+reading+comprehension+questions" }]
      },
      {
        title: "Integrating Reading and Writing",
        summary: "Reading to write",
        contents: ["Types of post-reading writing activities", "Teaching summaries and response writing", "Using AI feedback and its limits"],
        videos: [{ title: "Integrating reading and writing", url: "https://www.youtube.com/results?search_query=integrating+reading+and+writing+ESL" }]
      },
      {
        title: "Presenting AI-Integrated Reading Lessons",
        summary: "Final lesson plan presentations",
        contents: ["Team lesson plan presentations (15 minutes)", "Q&A and peer evaluation", "Discussing how to revise the lesson plans"],
        videos: [],
        assignment: { title: "AI-Integrated English Reading Lesson Plan", desc: "Write a 50-minute English reading lesson plan (including learning objectives, activities, how AI is used, and assessment) and submit it the day before your presentation.", due: "2026-11-30 23:59" }
      },
      {
        title: "Final Reflection and Portfolio",
        summary: "Wrapping up the semester",
        contents: ["Sharing portfolios", "Defining my own view of AI in English education", "Course evaluation"],
        videos: [],
        assignment: { title: "Final Portfolio", desc: "Combine all of your worksheets from the semester, your revised lesson plan, and a two-page final reflection, and submit them.", due: "2026-12-14 23:59" }
      }
    ]
  },

  /* ---------- 수업 달력 ---------- */
  calendar: {
    id: "calendar",
    title: "Class Calendar",
    lead: "Tuesday classes are shown automatically. Click a date to see that day's lesson."
  },

  /* ---------- 실시간 주제 투표 ---------- */
  vote: {
    id: "vote",
    title: "Which topic do you want to learn first?",
    lead: "Choose one and vote. The results appear right away as a bar chart. (Choosing again changes your vote.)",
    refreshSeconds: 10,              // 실제 운영 모드에서 결과를 새로 불러오는 간격
    options: [
      "Skimming & Scanning",
      "Creating leveled reading materials with AI",
      "Creating AI-based reading test items",
      "Critical reading and evaluating AI texts",
      "Integrating reading and writing"
    ]
  },

  /* ---------- 수강 신청서 ----------
     type: text / email / tel / select / radio / textarea
     required: true 면 필수 항목 (비어 있으면 제출 시 알려 줌)
     pattern: 입력 형식 검사 (정규식), patternMessage: 형식이 틀렸을 때 안내 문구        */
  apply: {
    id: "apply",
    title: "Enrollment Form",
    lead: "Please fill out the form below. Fields marked * are required.",
    fields: [
      { name: "name",    label: "Name",       type: "text",  required: true, placeholder: "Jane Kim" },
      { name: "sid",     label: "Student ID", type: "text",  required: true, placeholder: "2026123456", pattern: "^[0-9]{6,10}$", patternMessage: "Please enter your student ID as 6–10 digits." },
      { name: "major",   label: "Major",      type: "text",  required: true, placeholder: "English Education" },
      { name: "year",    label: "Year",       type: "select", required: true, options: ["1st year", "2nd year", "3rd year", "4th year", "Other"] },
      { name: "email",   label: "Email",      type: "email", required: true, placeholder: "name@university.ac.kr" },
      { name: "phone",   label: "Phone",      type: "tel",   required: false, placeholder: "010-0000-0000", pattern: "^[0-9\\-\\s]{9,13}$", patternMessage: "Please enter your phone number using digits and hyphens." },
      { name: "level",   label: "My English reading level", type: "radio", required: true, options: ["Beginner", "Intermediate", "Advanced"] },
      { name: "motive",  label: "Why do you want to take this course?", type: "textarea", required: true, placeholder: "Tell us what you hope to learn in this course." }
    ],
    consent: "I agree to the collection and use of my personal information (name, student ID, contact details) for course management.",
    successMessage: "Your enrollment has been received. Once the instructor approves it, click 'Log in' at the top right and enter your student ID and name to see the weekly lessons."
  },

  /* ---------- 수강생 공간: 로그인 · 출석 · 과제 제출 ----------
     로그인: 학번 + 이름 + 교수자가 안내한 비밀번호(PIN)
             (체험 모드에서는 아무 값이나 로그인됩니다)
     출석  : 수업이 있는 날(달력의 수업일)에만 체크할 수 있습니다.
     과제  : 위 '주차별 강의'에서 과제가 있는 주차가 자동으로 목록에 나옵니다.            */
  student: {
    id: "student",
    title: "Attendance & Assignments",
    lead: "Approved students can log in with their student ID and name to check in for class and see the weekly lessons.",
    maxFileMB: 10,
    accept: ".pdf,.doc,.docx,.hwp,.hwpx,.ppt,.pptx,.zip,.jpg,.png",
    allowLate: false                 // true 면 마감 후에도 제출 가능 (지각 제출로 표시)
  },

  /* ---------- 실습 AI 도구 ---------- */
  tools: {
    id: "tools",
    title: "AI Tools We Use",
    lead: "All of them are free to start. Please sign up before the first class.",
    items: [
      { icon: "🟠", name: "Claude",      use: "Creating materials & items", text: "Create and refine leveled English passages and reading questions.",                  link: "https://claude.ai" },
      { icon: "🟢", name: "ChatGPT",     use: "Conversational reading",     text: "Ask and answer questions about a passage to check comprehension and question quality.", link: "https://chatgpt.com" },
      { icon: "📒", name: "NotebookLM",  use: "Source-based learning",      text: "Upload readings and organize theory with answers that cite their sources.",            link: "https://notebooklm.google.com" },
      { icon: "🌐", name: "DeepL",       use: "Comparing translations",     text: "Compare originals and translations to explore differences in meaning and the limits of translation.", link: "https://www.deepl.com" },
      { icon: "🃏", name: "Quizlet",     use: "Vocabulary learning",        text: "Build key vocabulary sets for vocabulary activities.",                                 link: "https://quizlet.com" },
      { icon: "🧩", name: "Padlet",      use: "Collaboration board",        text: "Organize and share small-group discussions and lesson ideas together.",               link: "https://padlet.com" }
    ]
  },

  /* ---------- 수강 준비물 ---------- */
  prepare: {
    id: "prepare",
    title: "What to Prepare",
    lead: "Please check these items before the first class.",
    items: [
      { icon: "💻", title: "Laptop or tablet",             text: "We practice with AI online in every class. A laptop is recommended over a phone." },
      { icon: "🎧", title: "Zoom · earphones · microphone", text: "Install Zoom in advance, and prepare a stable internet connection, earphones, and a microphone." },
      { icon: "🔑", title: "AI tool accounts",             text: "Sign up for the AI tools above in advance (free accounts are enough)." },
      { icon: "📘", title: "Middle/high school English textbook", text: "Choose one or two textbook passages to use in practice (PDF is fine)." },
      { icon: "📚", title: "Pre-read the readings",        text: "Read each week's readings before class." }
    ]
  },

  /* ---------- Reading 자료 ---------- */
  readings: {
    id: "readings",
    title: "Readings",
    lead: "Reading ahead makes our discussions much richer.",
    items: [
      { tag: "Required", title: "Teaching and Researching Reading", author: "William Grabe & Fredricka L. Stoller", summary: "The core text, covering L2 reading theory, research, and classroom application.", link: "" },
      { tag: "Required", title: "Teaching Reading Skills in a Foreign Language", author: "Christine Nuttall", summary: "A step-by-step guide to teaching foreign language reading skills, with practical activities.", link: "" },
      { tag: "Optional", title: "AI-Integrated English Reading Lesson Pack", author: "Course materials", summary: "A collection of weekly practice guides and example prompts.", link: "" }
    ]
  },

  /* ---------- 문제풀이 ----------
     type: "choice" (객관식) 또는 "short" (단답형)
     객관식 answer = 정답 보기 번호(0부터 시작)
     단답형 answer = 정답으로 인정할 단어 목록           */
  quiz: {
    id: "quiz",
    title: "Quiz",
    lead: "Choose an answer, then click 'Check answer'.",
    questions: [
      {
        type: "choice",
        question: "Which strategy focuses on the title, first sentences, and last sentences to quickly grasp the main idea of a text?",
        options: ["Scanning", "Skimming", "Intensive reading", "Reading aloud"],
        answer: 1,
        explain: "Skimming is a strategy for quickly grasping the overall flow and main idea of a text rather than its details."
      },
      {
        type: "choice",
        question: "Which theory provides the basis for activities that draw on learners' background knowledge before reading?",
        options: ["Schema theory", "Behaviorism", "Contrastive Analysis Hypothesis", "Input Hypothesis"],
        answer: 0,
        explain: "Schema theory holds that a reader's background knowledge (schema) strongly affects how they understand a text."
      },
      {
        type: "choice",
        question: "What must a teacher do before using AI-generated leveled reading passages in class?",
        options: ["Use only the shortest version", "Compare it with the original and check for distorted meaning or errors", "Use it as is, since AI made it", "Have students fix it themselves"],
        answer: 1,
        explain: "AI can change or misstate content while simplifying a text, so the teacher must check it."
      },
      {
        type: "short",
        question: "Which strategy involves quickly searching a text for specific information, such as dates or names? (one English word)",
        answer: ["scanning"],
        explain: "Scanning means running your eyes over a text to find the specific information you need."
      }
    ]
  },

  /* ---------- 자주 묻는 질문 ---------- */
  faq: {
    id: "faq",
    title: "Frequently Asked Questions",
    lead: "Click a question to see the answer.",
    items: [
      { q: "Where are the classes held?",                        a: "All classes are held online only (live on Zoom). You can find the link in Weekly Lessons and the Class Calendar." },
      { q: "I've never used AI tools. Can I keep up?",           a: "Yes. We learn how to use the tools together in the first two weeks, and every practice session comes with step-by-step guidance." },
      { q: "Can I take this course if I'm not an English Education major?", a: "Yes. Anyone interested in teaching English reading is welcome." },
      { q: "Do I need a paid AI account?",                       a: "No. Every practice activity is designed to work with free accounts." },
      { q: "How is the course graded?",                          a: "Participation (quizzes and discussion) 20%, weekly assignments 30%, lesson plan presentation 20%, and final portfolio 30%." },
      { q: "If I miss a class, how can I catch up?",             a: "You can review the topics and videos in Weekly Lessons. For practice assignments, please email the instructor." },
      { q: "How do I check in for attendance?",                  a: "On class day, join Zoom, then log in from the 'Attendance' menu on this site and click 'Check in now'." }
    ]
  },

  /* ---------- 프로그램 한눈에 보기 (인포그래픽) ----------
     facts      : 맨 위 핵심 숫자            phases  : 15주 학습 여정 (from~to = 주차 범위)
     session    : 한 번의 수업 구성 (분)     assessment : 평가 비율 (합계 100)
     outcomes   : 수강 후 할 수 있게 되는 것                                              */
  infographic: {
    id: "infographic",
    title: "The Program at a Glance",
    lead: "The flow of the AI & English Language Education · Reading and Writing program on one page.",
    facts: [
      { icon: "🗓️", value: "15 weeks", label: "Tuesdays, 100 minutes" },
      { icon: "💻", value: "100%",     label: "Live online (Zoom)" },
      { icon: "🤖", value: "6",        label: "AI tools for practice" },
      { icon: "📝", value: "6",        label: "Weekly assignments" },
      { icon: "🎤", value: "2",        label: "Demo lessons & presentations" }
    ],
    phases: [
      { from: 1,  to: 4,  icon: "🧭", title: "Foundations",       items: ["The English reading process", "Schema activation & prediction", "Skimming & Scanning"] },
      { from: 5,  to: 8,  icon: "🔍", title: "Core strategies",   items: ["Vocabulary & text structure", "Inferencing & questioning", "Week 8 mini lesson demos"] },
      { from: 9,  to: 12, icon: "🤖", title: "Practice with AI",  items: ["Comparing AI summaries", "Critically reading AI texts", "Leveled materials & test items"] },
      { from: 13, to: 15, icon: "🏫", title: "Lesson design",     items: ["Integrating reading & writing", "AI-integrated lesson presentations", "Final portfolio"] }
    ],
    sessionTitle: "How each class runs (100 minutes)",
    session: [
      { label: "Lecture",          minutes: 30 },
      { label: "AI practice",      minutes: 40 },
      { label: "Group discussion", minutes: 20 },
      { label: "Wrap-up · check-in", minutes: 10 }
    ],
    assessmentTitle: "Grading",
    assessment: [
      { label: "Participation",       percent: 20 },
      { label: "Weekly assignments",  percent: 30 },
      { label: "Lesson presentation", percent: 20 },
      { label: "Final portfolio",     percent: 30 }
    ],
    outcomesTitle: "After this course, you will be able to",
    outcomes: [
      "Explain and model pre-, while-, and post-reading strategies",
      "Create and check leveled reading materials and test items with AI",
      "Design a 50-minute English reading lesson that uses AI"
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
