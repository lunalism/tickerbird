<div align="center">

# AlphaBoard

### 🌍 글로벌 투자자를 위한 원스톱 정보 플랫폼

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

<br />

실시간 글로벌 투자 뉴스와 시장 정보를 깔끔하고 직관적인 UI로 제공합니다.

</div>

---

## 📸 스크린샷

<div align="center">

| 메인 뉴스 피드 | 대시보드 |
|:---:|:---:|
| *뉴스 피드 스크린샷 추가 예정* | *대시보드 스크린샷 추가 예정* |

</div>

---

## ✨ 주요 기능

| 기능 | 설명 | 상태 |
|:---:|:---|:---:|
| 📰 **실시간 뉴스 피드** | 카테고리별 투자 뉴스 (종합, 속보, 분석, 암호화폐, 경제지표) | ✅ |
| 📊 **글로벌 시장 시세** | 실시간 주가 및 지수 정보 | 🚧 |
| 📅 **경제 캘린더** | 주요 경제 이벤트 일정 | 🚧 |
| ⭐ **관심종목 관리** | 개인 관심종목 추가 및 관리 | 🚧 |
| 🔐 **Google OAuth** | Supabase 기반 간편 로그인 | ✅ |
| 📱 **반응형 디자인** | 데스크톱, 태블릿, 모바일 완벽 지원 | ✅ |
| 🌙 **다크모드** | 눈의 피로를 줄여주는 다크 테마 | 📋 |
| 🌐 **다국어 지원** | 한국어, 영어, 일본어 | 📋 |

> ✅ 완료 &nbsp;&nbsp; 🚧 개발 중 &nbsp;&nbsp; 📋 예정

---

## 🌏 지원 시장

<div align="center">

### 현재 지원

| 🇺🇸 미국 | 🇰🇷 한국 | 🇯🇵 일본 | 🇭🇰 홍콩 |
|:---:|:---:|:---:|:---:|
| NYSE, NASDAQ | KOSPI, KOSDAQ | Nikkei | HSI |

### 지원 예정

| 🇬🇧 영국 | 🇩🇪 독일 | 🇫🇷 프랑스 |
|:---:|:---:|:---:|
| FTSE | DAX | CAC 40 |

</div>

---

## 📁 프로젝트 구조

```
alphaboard/
├── 📂 src/
│   ├── 📂 app/                    # Next.js App Router
│   │   ├── 📂 api/logo/[domain]/  # 로고 API 라우트
│   │   ├── 📂 auth/callback/      # OAuth 콜백
│   │   ├── 📂 dashboard/          # 대시보드 페이지
│   │   ├── 📂 login/              # 로그인 페이지
│   │   ├── 📄 globals.css         # 전역 스타일
│   │   ├── 📄 layout.tsx          # 루트 레이아웃
│   │   └── 📄 page.tsx            # 메인 페이지 (뉴스 피드)
│   │
│   ├── 📂 components/             # 컴포넌트
│   │   ├── 📂 common/icons/       # 공통 아이콘
│   │   ├── 📂 features/news/      # 뉴스 관련 컴포넌트
│   │   ├── 📂 layout/             # 레이아웃 (Sidebar, BottomNav)
│   │   └── 📂 ui/                 # UI 컴포넌트 (SearchBar, CategoryTabs)
│   │
│   ├── 📂 constants/              # 상수 정의
│   ├── 📂 lib/supabase/           # Supabase 클라이언트
│   ├── 📂 types/                  # TypeScript 타입 정의
│   ├── 📂 utils/                  # 유틸리티 함수
│   └── 📄 middleware.ts           # Next.js 미들웨어
│
├── 📄 .env.local.example          # 환경 변수 예시
├── 📄 next.config.ts              # Next.js 설정
├── 📄 tailwind.config.ts          # Tailwind CSS 설정
└── 📄 package.json                # 프로젝트 설정
```

---

## 🚀 설치 및 실행

### 1️⃣ 저장소 클론

```bash
git clone https://github.com/your-username/alphaboard.git
cd alphaboard
```

### 2️⃣ 의존성 설치

```bash
npm install
```

### 3️⃣ 환경 변수 설정

```bash
cp .env.local.example .env.local
```

### 4️⃣ Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. **Authentication** > **Providers** > **Google** 활성화
3. Google Cloud Console에서 OAuth 클라이언트 생성
4. Redirect URL 설정: `https://your-project.supabase.co/auth/v1/callback`

### 5️⃣ 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

---

## ⚙️ 환경 변수

| 변수명 | 설명 | 필수 |
|:---|:---|:---:|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Key | ✅ |
| `NEXT_PUBLIC_SITE_URL` | 사이트 URL (기본값: `http://localhost:3000`) | ✅ |

---

## 📜 스크립트

```bash
npm run dev      # 개발 서버 실행 (Turbopack)
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 실행
npm run lint     # ESLint 코드 검사
```

---

## 🗺️ 로드맵

### v0.2.0
- [ ] 다크모드 지원
- [ ] 실시간 시세 위젯
- [ ] 관심종목 기능

### v0.3.0
- [ ] 경제 캘린더
- [ ] 알림 기능
- [ ] PWA 지원

### v1.0.0
- [ ] 다국어 지원 (영어, 일본어)
- [ ] 유럽 시장 추가
- [ ] 포트폴리오 트래커

---

## 🤝 기여 방법

1. 이 저장소를 Fork 합니다
2. 새 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 Push 합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

---

## 📄 라이선스

이 프로젝트는 [MIT License](LICENSE)를 따릅니다.

---

<div align="center">

**Made with ❤️ by AlphaBoard Team**

</div>
