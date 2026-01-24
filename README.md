<div align="center">

<br />

# ✦ AlphaBoard

<h3>
  <em>Smart Investing Starts Here</em>
</h3>

<br />

**한국 · 미국 주식을 한눈에** | **AI 뉴스 요약** | **투자자 커뮤니티**

<br />

[![Next.js](https://img.shields.io/badge/Next.js_16-000?logo=nextdotjs&logoColor=fff)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=000)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind_4-06B6D4?logo=tailwindcss&logoColor=fff)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-DD2C00?logo=firebase&logoColor=fff)](https://firebase.google.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=fff)](https://supabase.com/)

<br />

<a href="#-features">Features</a> ·
<a href="#-tech-stack">Tech Stack</a> ·
<a href="#-getting-started">Getting Started</a> ·
<a href="#-contributing">Contributing</a>

<br />
<br />

</div>

---

<br />

## 📌 Overview

> **AlphaBoard**는 글로벌 투자자를 위한 올인원 금융 플랫폼입니다.
>
> 실시간 주식 시세, AI 기반 뉴스 요약, 투자자 커뮤니티를 하나의 서비스에서 경험하세요.

<br />

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔐 Authentication
Firebase 기반 안전한 인증
- Google OAuth 2.0 로그인
- 신규 사용자 온보딩 플로우
- 프로필 & 설정 관리

</td>
<td width="50%">

### 📰 News Feed
AI 기반 글로벌 금융 뉴스
- 카테고리별 뉴스 분류
- **Claude AI 요약** 기능
- 원문/번역 토글

</td>
</tr>
<tr>
<td width="50%">

### 💹 Real-time Quotes
한국투자증권 API 연동
- 🇰🇷 KOSPI/KOSDAQ 실시간 시세
- 🇺🇸 NYSE/NASDAQ 실시간 시세
- 4대 지수 위젯 & 차트

</td>
<td width="50%">

### 👥 Community
투자자 소통 공간
- 게시글/댓글 CRUD
- 좋아요 & 종목 태그 (`$AAPL`)
- 태그 종목 실시간 시세 카드

</td>
</tr>
<tr>
<td width="50%">

### ⭐ Watchlist
나만의 관심종목 관리
- 종목 검색 & 추가
- 실시간 시세 모니터링
- 드래그로 순서 변경

</td>
<td width="50%">

### 🔔 Price Alerts
목표가 알림 시스템
- 종목별 목표가 설정
- 상승/하락 조건 선택
- 알림 히스토리

</td>
</tr>
<tr>
<td width="50%">

### 🔍 Search
빠른 종목 검색
- 한글/영문 종목명 검색
- 티커 코드 검색
- 검색 결과 즉시 이동

</td>
<td width="50%">

### 🌙 Dark Mode
눈 편한 다크 테마
- 시스템 테마 자동 감지
- 수동 테마 전환

</td>
</tr>
</table>

<br />

## 🛠 Tech Stack

<table>
<tr>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=nextjs" width="48" height="48" alt="Next.js" />
<br /><strong>Next.js 16</strong>
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=react" width="48" height="48" alt="React" />
<br /><strong>React 19</strong>
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=ts" width="48" height="48" alt="TypeScript" />
<br /><strong>TypeScript</strong>
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=tailwind" width="48" height="48" alt="Tailwind" />
<br /><strong>Tailwind 4</strong>
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=firebase" width="48" height="48" alt="Firebase" />
<br /><strong>Firebase</strong>
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=supabase" width="48" height="48" alt="Supabase" />
<br /><strong>Supabase</strong>
</td>
</tr>
</table>

<br />

<details>
<summary><strong>📦 Dependencies</strong></summary>

<br />

| Category | Technologies |
|:---------|:-------------|
| **Framework** | Next.js 16, React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 |
| **State** | Zustand 5 |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Firebase Authentication |
| **Charts** | Recharts 3 |
| **AI** | Claude API (Anthropic) |
| **Stock API** | 한국투자증권 OpenAPI |

</details>

<br />

## 📸 Screenshots

<table>
<tr>
<td align="center">
<strong>📰 News Feed</strong>
<br /><br />
<em>Coming Soon</em>
</td>
<td align="center">
<strong>💹 Market</strong>
<br /><br />
<em>Coming Soon</em>
</td>
</tr>
<tr>
<td align="center">
<strong>👥 Community</strong>
<br /><br />
<em>Coming Soon</em>
</td>
<td align="center">
<strong>📊 Stock Detail</strong>
<br /><br />
<em>Coming Soon</em>
</td>
</tr>
</table>

<br />

## 🚀 Getting Started

### Prerequisites

- Node.js 18.17+
- npm / yarn / pnpm

### Installation

```bash
# 1. Clone
git clone https://github.com/lunalism/alphaboard.git
cd alphaboard

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.local.example .env.local

# 4. Run dev server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

<br />

<details>
<summary><strong>⚙️ Environment Variables</strong></summary>

<br />

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id

# Korea Investment API
KIS_APP_KEY=your_kis_app_key
KIS_APP_SECRET=your_kis_app_secret

# Claude AI
ANTHROPIC_API_KEY=your_anthropic_api_key
```

</details>

<br />

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── kis/           # 한투 API (주식 시세)
│   │   ├── community/     # 커뮤니티 API
│   │   └── news/          # 뉴스 API
│   ├── community/         # 커뮤니티 페이지
│   ├── market/            # 시세 페이지
│   └── news/              # 뉴스 페이지
│
├── components/
│   ├── features/          # 기능별 컴포넌트
│   ├── layout/            # 레이아웃
│   └── ui/                # UI 컴포넌트
│
├── hooks/                 # Custom Hooks
├── lib/                   # Firebase, Supabase 설정
├── stores/                # Zustand 스토어
└── types/                 # TypeScript 타입
```

<br />

## 🔌 API Reference

<details>
<summary><strong>Stock Price API</strong></summary>

<br />

```http
GET /api/kis/stock/price?symbol=005930
```

```json
{
  "stockName": "삼성전자",
  "currentPrice": 75000,
  "changePercent": 1.35
}
```

```http
GET /api/kis/overseas/stock/price?symbol=AAPL
```

```json
{
  "name": "Apple Inc",
  "nameKr": "애플",
  "currentPrice": 185.50,
  "changePercent": 2.15
}
```

</details>

<details>
<summary><strong>Community API</strong></summary>

<br />

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/community/posts` | 게시글 목록 |
| `POST` | `/api/community/posts` | 게시글 작성 |
| `GET` | `/api/community/posts/[id]` | 게시글 상세 |
| `PUT` | `/api/community/posts/[id]` | 게시글 수정 |
| `DELETE` | `/api/community/posts/[id]` | 게시글 삭제 |
| `GET` | `/api/community/posts/[id]/comments` | 댓글 목록 |
| `POST` | `/api/community/posts/[id]/comments` | 댓글 작성 |

</details>

<br />

## 🤝 Contributing

Contributions are welcome!

```bash
# Fork & Clone
git checkout -b feature/amazing-feature
git commit -m "feat: Add amazing feature"
git push origin feature/amazing-feature
# Open Pull Request
```

<details>
<summary><strong>Commit Convention</strong></summary>

<br />

| Type | Description |
|:-----|:------------|
| `feat` | 새로운 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서 수정 |
| `style` | 포맷팅 |
| `refactor` | 리팩토링 |
| `test` | 테스트 |
| `chore` | 기타 변경 |

</details>

<br />

## 📄 License

This project is licensed under the [MIT License](LICENSE).

<br />

---

<div align="center">

<br />

**Built with ❤️ for Global Investors**

<br />

</div>
