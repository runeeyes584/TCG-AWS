# Project Architecture Scan

Project-scan summary for the TCG-AWS (Chrono Genesis / Kaleidoscope TCG) repository, refreshed on 2026-10-06 from the Back-end and Front-end source. The complete analysis, diagrams, route tables and risk list live in [Architecture.md](Architecture.md), which is the canonical document to update when the implementation changes.

## 1. Project Overview

A TypeScript 1v1 collectible card game with a Next.js static frontend, a shared authoritative game engine, Cognito authentication, DynamoDB persistence, API Gateway HTTP and WebSocket endpoints, Lambda handlers, SQS post-match processing and EventBridge Scheduler (turn timeouts and a 10-minute rank rebuild). A second, local runtime (Express + Socket.IO) exists for development, and the browser also runs the engine directly for trial mode.

## 2. Technology Stack

TypeScript (strict, ESM) on Node.js 24; Next.js 15.5, React 19, Tailwind 4, Zustand, framer-motion; Phaser 4.2.1 (Canvas for the battlefield, WebGL for the lobby splash); Express 5 with `@codegenie/serverless-express`; API Gateway WebSocket and Management API; `socket.io` for local development; Cognito with `jose`; DynamoDB; SQS; EventBridge Scheduler; Amplify frontend hosting; esbuild; Vitest.

## 3. Project Structure

`Front-end/src/app` (routes), `components/` (game, phaser, lobby, matchmaking, deck, rank, user, audio, auth, ui), `hooks/`, `libs/`, `contexts/`. `Back-end/src/game` (engine: core, rules, operations, mechanics, entities, data), `aws-lambdas/` (production handlers), `http/`, `auth/`, `user/`, `leaderboard/`, `config/`, `database/`, `shared/`, plus the local-only `server/` and `matchmaking/`. `scripts/` builds Lambda zips, `.agents/` holds the agent rules and AWS runbooks.

## 4. Architecture Overview

The production path is stateless Lambdas around a DynamoDB-backed match aggregate. The browser uses REST (one Express Lambda behind an HTTP API) for identity, decks, history, rank and pending matches, and a WebSocket API for match commands and state pushes. Each WebSocket route maps to its own Lambda. Route-to-Lambda mapping and IAM are not in the repository (documented only as manual AWS Console steps).

## 5. Module / Component Responsibilities

Frontend: pages compose components behind `AuthGuard`; `useGameMatch` owns the realtime match lifecycle and `useLocalGame` offers the same controller for trial play; `libs/socket.ts` selects the transport; `libs/api.ts` is the only REST client; `GameBoard` renders the HUD and dispatches actions; the Phaser layer only presents state through `useGameStore` and `arenaEventBus`. Backend: handlers own connection, matchmaking, action, timeout, surrender, cancel, disconnect and result lifecycle; the engine owns every transition; repositories own DynamoDB access; workers own ELO, history and ranking.

## 6. Application Entry Points & Lifecycle

Frontend: `next dev Front-end`, `next build`, `next start`; Amplify builds `Front-end` with Node 24. Routes: `/`, `/play` (also `?room=&resume=1` and `?trial=1`), `/room-create`, `/room-join`, `/deck-builder`, `/gallery`, `/history`, `/rank`, `/user`, auth pages and the local `/duel`. Backend: `aws-lambdas/httpBackend.ts` wraps `http/app.ts`; WebSocket handlers are `connectHandler`, `startMatch`, `processGameEngine`, `endMatch`, `cancelMatch`, `disconnectHandler`; `handleTimeout`, `postMatchWorker` and `rebuildLeaderboardRanks` are invoked by Scheduler or SQS. Local: `npm run dev:socket` runs `server/index.ts`.

## 7. Main Flows

Registration and login go through Cognito and create a `UserProfile`; the client stores tokens, then warms its caches. Matchmaking creates or claims a `GameState` record (global DynamoDB lock, ELO range 200), and private rooms use six-character codes. Actions are authenticated by connection id, applied by the engine, conditionally committed and pushed as redacted state. Finished matches go through SQS to a transactional ELO/history update, and a periodic job assigns exact ranks.

## 8. Data Flow

Cognito `sub` identifies users. Profiles hold stats, decks and leaderboard projection fields. `GameState` stores the authoritative snapshot, `GameLogs` stores the audit trail, `Connections` maps sockets to users and matches, and `MatchHistory` receives per-player results. The browser keeps a non-authoritative copy in React state and mirrors it into Zustand for Phaser.

## 9. Event Flow

In-game events (`CARD_PLAYED`, `UNIT_DIED`, `NEXUS_DAMAGED`, ...) trigger abilities and enqueue effects synchronously. AWS events are WebSocket routes, Scheduler invocations and SQS batches. Server-to-client messages include `room:update`, `matchmaking:found`, `match:resume_required`, `match:ended`, `profile:updated` and `rank:changed`. On the client, `arenaEventBus` carries presentation events to Phaser.

## 10. State Management & State Transitions

Matches move `WAITING -> IN_PROGRESS -> FINISHED`. Engine phases are `ACTION -> BLOCK -> COMBAT`, with `DISCARD` and pending choices as blocking sub-states. DynamoDB conditional writes use state version, turn timestamps and priority player. Turn timeout is hybrid: a client `TIME_OUT` validated by the server, with an EventBridge schedule as the safety net.

## 11. API / Service Communication

HTTP: `/health`, `/auth/*`, `/matches/*` (pending, cancel, forfeit, history), `/decks`, `/leaderboard` (`/`, `/me`), `/user/*` (profile, avatar, username, delete account). WebSocket client routes: `matchfinding-start`, `room-create`, `room-join`, `game-action`, `game-surrender`, `matchfinding-cancel`. The local Socket.IO contract uses `matchmaking:*`, `room:*`, `game:*` events and is translated by `SocketManager`. The local server does not expose `/leaderboard`.

## 12. Database / Data Model

Tables: `UserProfile` (with `LeaderboardIndex`), `AccountDeletionCooldown`, `GameState` (also holds the matchmaking lock item and the `expire_at` TTL attribute), `GameLogs`, `Connections`, `MatchHistory`. `database.types.ts` keeps an older snake_case model that the active camelCase engine state no longer uses. Many lookups still use table scans.

## 13. Authentication & Authorization

Cognito handles the account lifecycle. HTTP accepts a Bearer header, then the `access_token` cookie. WebSocket `$connect` verifies a query-string or Bearer token before storing the connection. Actions derive the player from the connection id and reject mismatches and server-only actions. The frontend keeps tokens in localStorage and refreshes them before expiry.

## 14. External Integrations

Cognito, DynamoDB, API Gateway (HTTP, WebSocket, Management API), SQS, EventBridge Scheduler, Amplify Hosting (frontend only), optional Secrets Manager / STS credential paths, and third-party image hosts for card art. Backend infrastructure definitions are not in the repository.

## 15. Configuration & Environment

Backend settings cover regions, Cognito IDs, table names, `WS_MANAGEMENT_ENDPOINT`, `SQS_MATCH_RESULTS_QUEUE_URL`, Scheduler role and target ARNs, CORS origins and TTLs. Frontend `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_SOCKET_URL` and `NEXT_PUBLIC_MATCHMAKING_ROUTE` are embedded at build time. Local dotenv loads `Back-end/.env`; Lambdas use execution roles. Lambda zips are built with `npm run build:lambda:*` (no scripts exist for end/cancel/disconnect).

## 16. Important Business Logic

Nexus 20 HP, max mana 10, spell mana 3, hand and board limit 6, 30-card decks with at most 3 copies and 6 champions. Phases, priority, attack token, keywords, spell speeds, abilities, effects, graveyard operations and champion level-ups are all engine rules. AFK turns are 30 s (15 s after a strike), three strikes lose. ELO K=32 (default 1000), EXP 100/35/50, `level = floor(exp/1000)+1`. Username changes have a 30-day cooldown and deleted emails a 24-hour cooldown.

## 17. Dependencies & Coupling

Handlers depend on DynamoDB attribute names and API Gateway event shapes. The engine is shared by Lambdas, the local server and the browser (through the `@backend/*` alias), with circular imports between `core/engine` and `mechanics`/`operations`. The serialized `GameState` couples rules, registry and persistence. `server/index.ts` duplicates some HTTP routes.

## 18. Architectural Patterns

Stateless serverless handlers; authoritative state machine; synchronous event/effect queue; optimistic concurrency; SQS outbox-like post-processing with idempotency; leaderboard projection; transport adapter (Socket.IO vs API Gateway WebSocket); controller hooks shared by online and local play; Zustand plus event-bus bridge between React and Phaser; stale-while-revalidate caches.

## 19. Critical Risks / Inconsistencies

No backend IaC; local and production runtimes diverge; table scans and a single matchmaking lock will not scale; opponent-hand redaction is duplicated in seven files and still sends `rngSeed`; schema drift in `database.types.ts`; whole-state writes; token in the WebSocket query string and in localStorage; CORS accepts any `amplifyapp.com` origin and the runbook's CORS methods omit PATCH/DELETE; several screens mount multiple Phaser instances and there is no error boundary; dead files (`MatchRecoveryPhaserLoader`, `useLoopingAudio`, `UiaCard.json`, missing `seedData.ts`) and committed `aws-lambdas/dist` output; stale `readme.md`.

## 20. Key Files & Entry Points

`Front-end/src/hooks/useGameMatch.ts`, `libs/socket.ts`, `libs/apiGatewaySocket.ts`, `libs/api.ts`, `components/game/GameBoard.tsx`, `components/game/phaser/PhaserArenaCanvas.tsx`; `Back-end/src/aws-lambdas/httpBackend.ts`, `connectHandler.ts`, `startMatch.ts`, `processGameEngine.ts`, `handleTimeout.ts`, `postMatchWorker.ts`, `rebuildLeaderboardRanks.ts`; `Back-end/src/http/app.ts`, `game/core/engine.ts`, `config/dynamodb.ts`, `server/index.ts`; `.agents/rule/rule.md`.

## 21. System Mental Model

The browser sends authenticated commands; a Lambda validates one command and applies one engine transition; DynamoDB conditionally commits the authoritative snapshot; API Gateway publishes a player-redacted view; Scheduler and SQS continue asynchronous work. Browser state, logs, notifications and SQS fields are secondary to the committed GameState. Trial play runs the same engine locally with no server.

For flow diagrams, route tables, file-level evidence and the full risk analysis, see [Architecture.md](Architecture.md).
