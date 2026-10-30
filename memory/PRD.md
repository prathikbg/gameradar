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

## Backlog
- P1: Release reminders by email for wishlisted games
- P1: Gaming news feed
- P2: User reviews/ratings, compare games, game deals/price tracking
