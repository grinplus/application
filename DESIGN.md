---
metadata:
  title: "Sophisticated Kandinsky Instructional Design System"
  version: "1.3.0"
  description: "칸딘스키의 면과 선을 극도로 절제하여, 미술관 아카이브처럼 깔끔하고 세련되게 정제한 교수 설계 명세서"
tokens:
  colors:
    # 캔버스 & 서피스: 프리미엄 미니멀리즘을 위한 저채도 베이스
    background-canvas: "#F8FAFC"  # 눈이 편안한 은은한 미색 그레이 (Slate 50)
    background-surface: "#FFFFFF" # 콘텐츠가 얹어지는 메인 화이트 캔버스
    text-primary: "#0F172A"       # 깊이감 있는 하이엔드 먹색 (Slate 900)
    text-secondary: "#64748B"     # 세련된 서브 타이포용 그레이 (Slate 500)

    # 칸딘스키 기하학 포인트: 원색을 배제하고 극도로 정제된 하이엔드 뮤트 톤
    kandinsky-blue: "#1E40AF"     # [파랑] 깊고 지적인 울트라마린 네이비 (핵심 액션/진도)
    kandinsky-yellow: "#F59E0B"   # [노랑] 따뜻하고 정제된 오커 앰버 (주의/교수자 팁)
    kandinsky-red: "#991B1B"      # [빨강] 톤다운된 고급스러운 버건디 레드 (에러/중요 알림)

    # 조형적 선(Line) 및 경계
    geometric-line: "#CBD5E1"     # 비대칭 분할 및 구조적 사선용 라이트 그레이 (Slate 300)
    border-muted: "#E2E8F0"       # 컴포넌트 기본 경계선 (Slate 200)

  typography:
    font-family: "'Pretendard', -apple-system, sans-serif"
    line-height-body: "1.8"       # 타이포그래피 자체를 여백으로 활용하기 위한 넓은 행간
    letter-spacing: "-0.02em"     # 세련된 인상을 주는 미세한 자간 좁히기

  geometry:
    # 모던 건축물처럼 딱 떨어지는 직선 구조와 완벽한 원의 대비
    card-radius: "0px"            # 메인 카드는 타협 없는 직각(0px)으로 세련미 극대화
    button-radius: "9999px"       # 액션 버튼은 완벽한 캡슐/원형 형태로 매치
    line-thin: "1px"
    line-thick: "2px"
---

## 🎨 디자인 원칙 (Sophisticated Principles)

### 1. 면(Plane)의 비대칭적 분할 (Asymmetric Spatial Division)
* 화면을 기계적으로 5:5 분할하지 않습니다. 좌측 메뉴나 인덱스를 3, 우측 콘텐츠를 7의 비율로 잡고, 경계선(`geometric-line`)을 화면 끝까지 과감하게 연장하여 미술관 리플렛 같은 구조적 세련미를 줍니다.
* 불필요한 장식 아이콘을 전면 배제하고, 여백과 폰트 크기 차이만으로 시선의 흐름을 유도합니다.

### 2. 선(Line)을 통한 긴장감 조성 (Tension via Structural Lines)
* 섹션 간 구분을 부드러운 여백 대신 1px의 칼 같은 직선(`geometric-line`)으로 끊어내어 모던하고 정갈한 긴장감을 부여합니다.
* 전체 대시보드의 빈 공간 한 구석에는 텍스트 가독성을 해치지 않는 수준에서 45도 기울어진 얇은 장식용 사선(Diagonal Line)을 투명도 30%로 은은하게 배치합니다.

### 3. 절제된 점(Point)과 원(Circle)의 악센트
* 리스트의 불릿이나 진행 단계를 표시할 때, 채워진 원형 오브젝트 대신 안이 비어 있는 얇은 원 테두리(Stroke Circle)나 아주 미니멀한 점(`text-primary`)을 활용하여 시각적 과부하를 줄입니다.

## 🧱 핵심 컴포넌트 가이드라인

### 📖 교수 설계 본문 뷰어 (The Fine Art Reader)
* **구조:** 배경은 완전한 `#FFFFFF` 면이며, 모서리는 sharp한 `0px` 직각 구조입니다.
* **타이포:** 대제목은 아주 두껍고 거대하게(Font-Bold, 2rem), 본문 텍스트는 리딩 피로도를 낮추기 위해 `text-secondary` 컬러로 단정하게 배치하여 톤의 대비를 극대화합니다.

### 💡 교수자 아카이브 노트 (Minimalist Indicator)
* **스타일:** 노트를 감싸는 테두리 상자를 없앱니다. 대신 본문 왼쪽 여백에 `kandinsky-blue` 컬러의 작은 점 하나를 찍고, 얇은 세로선 하나로 본문과 격리된 넓은 여백 공간을 만들어 그 안에 교수자 팁을 배치합니다.

## ⚠️ 클로드 코드 가드레일 (Code Guardrails)
* ❌ 어설프게 둥근 모서리(border-radius: 4px, 8px 등)는 모던 세련미를 해치므로 절대 사용 금지. 오직 **완전한 직각(0px)** 또는 **완전한 원(9999px)**만 허용합니다.
* ❌ 컴포넌트에 입체감을 주는 드롭 섀도우(그림자) 효과는 일절 금지하며, 오직 2차원의 면과 선의 배치로만 깊이감을 표현합니다.
