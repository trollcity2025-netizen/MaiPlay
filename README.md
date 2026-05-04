# MaiPlay.cloud

Hybrid video platform combining YouTube UGC with Netflix premium content.

## Tech Stack
- Frontend: React + Vite + Tailwind + shadcn/ui
- Backend: Supabase (Postgres, Auth, Storage, Realtime)
- Payments: PayPal
- State: React Query
- Routing: React Router

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

3. Run development server:
```bash
npm run dev
```

## Folder Structure

```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── video/        # Video player, cards, comments
│   ├── creator/      # Creator dashboard components
│   ├── gifting/      # Coin gifting overlay
│   └── payment/      # PayPal integration
├── pages/
│   ├── auth/         # Login, Register
│   └── creator/      # Dashboard, Upload
├── hooks/            # React Query hooks
├── lib/              # Supabase client, utils
├── types/            # TypeScript types
└── styles/           # Global CSS
```

## Creator Unlock Requirements
- 200 subscribers
- 1000 total video views
- 500 short views

Once unlocked, creators can:
- Enable monetization dashboard
- Upload monetized content
- Earn from ads, gifts, and subscriptions