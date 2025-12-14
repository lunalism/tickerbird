# AlphaBoard

글로벌 투자 정보 플랫폼

## 소개

AlphaBoard는 실시간 글로벌 투자 뉴스와 시장 정보를 제공하는 웹 플랫폼입니다. 깔끔하고 직관적인 UI로 투자자들이 필요한 정보를 빠르게 확인할 수 있습니다.

## 기술 스택

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **UI**: React 19
- **Styling**: Tailwind CSS 4
- **Database & Auth**: Supabase
- **Font**: Pretendard

## 주요 기능

- **뉴스 피드**: 카테고리별 투자 뉴스 (종합, 속보, 분석, 암호화폐, 경제지표 등)
- **반응형 디자인**: 데스크톱, 태블릿, 모바일 완벽 지원
- **반응형 그리드**: 화면 크기에 따라 1~4열 그리드 자동 조정
- **사용자 인터랙션**: 좋아요, 북마크, 댓글 기능
- **Google OAuth**: Supabase를 통한 Google 로그인
- **대시보드**: 로그인 사용자를 위한 개인 대시보드

## 프로젝트 구조

```
alphaboard/
├── src/
│   ├── app/
│   │   ├── auth/callback/     # OAuth 콜백
│   │   ├── dashboard/         # 대시보드 페이지
│   │   ├── login/             # 로그인 페이지
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx           # 메인 페이지 (뉴스 피드)
│   ├── lib/supabase/
│   │   ├── client.ts          # 브라우저 클라이언트
│   │   ├── server.ts          # 서버 클라이언트
│   │   └── middleware.ts      # 세션 관리
│   └── middleware.ts
├── .env.local.example
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

## 설치 및 실행

### 1. 저장소 클론

```bash
git clone https://github.com/your-username/alphaboard.git
cd alphaboard
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 열고 Supabase 프로젝트 정보를 입력합니다:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. Authentication > Providers > Google 활성화
3. Google Cloud Console에서 OAuth 클라이언트 생성
4. Redirect URL 설정: `https://your-project.supabase.co/auth/v1/callback`

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 스크립트

```bash
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 실행
npm run lint     # ESLint 실행
```

## 스크린샷

> 스크린샷은 추후 추가 예정

## 라이선스

MIT License
