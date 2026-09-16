# Project Architecture Scan

This is the generated project-scan artifact for the TCG-AWS repository. The complete, self-contained architecture analysis is maintained in [Architecture.md](Architecture.md), which is the canonical document to update when the implementation changes.

## 1. Project Overview

A TypeScript collectible card game with a Next.js frontend, shared authoritative game engine, Cognito authentication, DynamoDB persistence, API Gateway WebSocket/HTTP integration, Lambda handlers, SQS post-match processing, and EventBridge Scheduler turn timeouts.

## 2. Technology Stack

TypeScript and Node.js 24; Next.js 15 and React 19; Phaser 4.2.1/Phaser Splash; Express 5; API Gateway WebSocket and Management API; Socket.IO for local development; Cognito; DynamoDB; SQS; EventBridge Scheduler; Amplify frontend hosting/build; esbuild; Vitest.

## 3. Project Structure

`Front-end/` contains the Next app. `Back-end/src/game/` contains the rules and engine. `Back-end/src/aws-lambdas/` contains production handlers. `Back-end/src/http/`, `auth/`, `user/`, `leaderboard/`, and `config/` contain backend services. `server/` and `matchmaking/` contain the local runtime.

## 4. Architecture Overview

The production path is stateless Lambda handlers around a DynamoDB-backed match aggregate. The frontend communicates over REST and WebSocket. The local path uses an in-memory Socket.IO server. Complete Mermaid diagrams are in `Architecture.md`.

## 5. Module / Component Responsibilities

The frontend owns UI and transport adapters; HTTP owns REST; auth owns Cognito verification; Lambda handlers own connection, matchmaking, action, timeout, disconnect, and result lifecycle; the game engine owns authoritative transitions; repositories own DynamoDB access; workers own post-match stats and ranking.

## 6. Application Entry Points & Lifecycle

Frontend: `next dev`, `next build`, `next start`. HTTP: `aws-lambdas/httpBackend.ts` wraps `http/app.ts`. WebSocket: `connectHandler.ts`, `startMatch.ts`, action/timeout/end/disconnect handlers. Local: `server/index.ts` starts Express and Socket.IO.

## 7. Main Flows

Registration calls Cognito and creates a UserProfile. Matchmaking creates or joins a durable GameState. Actions are authenticated by connection, applied by the engine, conditionally committed, and pushed as redacted state. Finished matches enter SQS post-processing.

## 8. Data Flow

Cognito `sub` identifies users. Profiles provide identity and ratings. GameState stores the authoritative snapshot. GameLogs stores audit records. SQS carries completion signals. MatchHistory and UserProfile receive transactional results. Leaderboard projections are queried through a GSI.

## 9. Event Flow

Internal game events synchronously trigger abilities and effects. API Gateway events invoke WebSocket Lambdas. EventBridge Scheduler invokes timeout processing. SQS invokes the post-match worker. Direct EventBridge event-bus usage is not verified.

## 10. State Management & State Transitions

Matches move `WAITING -> IN_PROGRESS -> FINISHED`. Engine phases move through action, block, combat, and discard/pending-choice states. DynamoDB conditional writes use state version, turn timestamps, and priority player to prevent stale overwrites.

## 11. API / Service Communication

HTTP exposes auth, matches, decks, leaderboard, user, and health routes. Production WebSocket routes include matchfinding, room create/join, game action, surrender, and cancellation. Local Socket.IO uses a separate event contract translated by the frontend adapter.

## 12. Database / Data Model

Tables are `UserProfile`, `AccountDeletionCooldown`, `GameState`, `GameLogs`, `Connections`, and `MatchHistory`. `UserProfile` has `LeaderboardIndex`. The active engine uses camelCase state fields while `database.types.ts` retains an older snake_case model.

## 13. Authentication & Authorization

Cognito handles account lifecycle. HTTP accepts cookie or bearer access tokens. WebSocket connect verifies a token before storing a connection. Actions derive player identity from connection ID and reject mismatched or server-only actions.

## 14. External Integrations

Verified integrations are Cognito, DynamoDB, API Gateway WebSocket/Management API, SQS, EventBridge Scheduler, optional Secrets Manager/STS credential paths, and Amplify frontend build. Backend Amplify/IaC definitions are not present in the repository tree.

## 15. Configuration & Environment

Important settings cover AWS/Cognito regions and IDs, table names, WebSocket management endpoint, SQS queue URL, Scheduler role and target Lambda ARN, CORS origins, TTLs, and frontend API/WebSocket URLs. Local dotenv is loaded; Lambda uses environment variables and execution roles by default.

## 16. Important Business Logic

The engine enforces mana, hand, board, phase, priority, combat, spell, target, graveyard, champion, Nexus, timeout, and surrender rules. Post-match processing applies ELO, wins/losses, EXP, levels, history, and leaderboard projections.

## 17. Dependencies & Coupling

All production handlers depend on DynamoDB attribute names and API Gateway event shapes. The engine is shared across local and serverless paths. The large serialized GameState couples rules, card registry, effects, persistence, and transport. HTTP and local server route definitions overlap.

## 18. Architectural Patterns

Stateless serverless handlers; authoritative state machine; synchronous event/effect queue; optimistic concurrency; SQS outbox-like post-processing; leaderboard projection; local/serverless transport adapter; best-effort realtime notifications after durable writes.

## 19. Critical Risks / Inconsistencies

The repository lacks backend infrastructure definitions and route/IAM mappings. Local and production transports diverge. Scan-based matchmaking and rebinding will scale poorly. Database type drift exists. Whole-state rewrites increase contention. WebSocket query tokens require log redaction. Scheduler and optional credential configuration add operational risk.

## 20. Key Files & Entry Points

Key entry points are `Front-end/src/hooks/useGameMatch.ts`, `Front-end/src/libs/socket.ts`, `Back-end/src/aws-lambdas/httpBackend.ts`, `connectHandler.ts`, `startMatch.ts`, `processGameEngine.ts`, `handleTimeout.ts`, `postMatchWorker.ts`, `Back-end/src/http/app.ts`, `Back-end/src/game/core/engine.ts`, `Back-end/src/config/dynamodb.ts`, and `Back-end/src/server/index.ts`.

## 21. System Mental Model

The browser sends authenticated commands; Lambda validates and applies one engine transition; DynamoDB conditionally commits the authoritative snapshot; API Gateway publishes redacted state; Scheduler and SQS continue asynchronous work. Browser state, logs, notifications, and SQS message fields are secondary to committed GameState.

For verified details, flow diagrams, file-level evidence, and the full risk analysis, see [Architecture.md](Architecture.md).
