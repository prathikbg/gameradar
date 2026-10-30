# GameRadar — PRD

## Problem statement
Webapp where gamers get info on newly launched games (PS5/Xbox/others), most played games, all game info, plus more content.

## Choices
RAWG live data (RAWG_API_KEY), new releases by platform, trending/most-played charts, game detail pages, upcoming calendar, AI game guide (Claude Sonnet 5.5 via Emergent LLM key), Emergent Google Sign-In (wishlist).

## Architecture
FastAPI proxy to RAWG with 15-min in-memory cache; MongoDB: users, user_sessions, wishlist, ai_messages. React + Tailwind dark "tactical" theme.

## Implemented (2026-06)
- Home: #1 trending hero, top-6 most played, new releases w/ platform chips, coming soon row
- /releases (filter, sort, load more), /charts (trending, all-time, top rated + platform), /calendar (month groups/filter, countdown)
- /game/:id: screenshots lightbox, trailer, stats, stores, PC requirements, Ask AI
- Search, AI Guide (SSE streaming, persisted history), Google login + wishlist
- Tested: iterations 1–2 all passing

## Iteration 2 (2026-06)
- Release-day email reminders (Emergent managed Resend, daily cron 9am UTC via .emergent/crons.yml -> /api/cron/release-reminders, refreshes RAWG dates, idempotent), toggle on Wishlist
- News feed (/news): PlayStation Blog, Xbox Wire, IGN, GameSpot, PC Gamer, Nintendo Everything, My Nintendo News RSS; platform + category filters
- Player reviews (1–5 stars + text, one per user/game) on game pages
- Compare (/compare?a=&b=): side-by-side stats, winner highlight, live PC price (CheapShark) + store links; PC price box on game pages
- Tested: iteration 3 (48/48 backend) + follow-up fixes

## Iteration 3 (2026-10)
- Favicon/app icons + manifest, real title/meta; AdSense script + ads.txt (Auto ads)
- Consent Mode v2 defaults (EEA/UK/CH denied) + cookie banner for Europe timezones, reopen from footer/privacy
- /showcases fixed-list countdown hub (src/data/showcases.js), /about, /privacy, /contact (saved to contact_messages, 5/hr/IP)

## Backlog
- P1: Showcase/event countdown hub, user profiles
- P2: Price-drop alerts, follow other gamers
