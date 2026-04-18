# Multiplayer Tic-Tac-Toe with Nakama

A production-ready multiplayer Tic-Tac-Toe game built with server-authoritative architecture using Nakama as the backend infrastructure.

## Live Links

- **Frontend (Vercel):** https://frontend-phi-two-45.vercel.app
- **Nakama Server (Railway):** https://nakama-tictactoe-production-4bad.up.railway.app
- **Source Code:** https://github.com/Mahesh741/nakama-tictactoe

---

## Tech Stack

- **Backend:** Nakama 3.22.0 (Game Server) + PostgreSQL
- **Frontend:** React + Vite
- **Backend Logic:** TypeScript (compiled to JS for Nakama runtime)
- **Deployment:** Railway (backend) + Vercel (frontend)

---

## Architecture & Design Decisions

### Server-Authoritative Game Logic
All game state is managed on the server side using Nakama's authoritative match system. The client never directly modifies the board — it only sends move requests. The server validates each move and broadcasts the updated state to all players.

### Match Flow
1. Player authenticates with a username (device auth)
2. Player clicks "Find Random Match" — enters Nakama's matchmaker queue
3. When 2 players are found, Nakama triggers `matchmakerMatched` which creates an authoritative `tic-tac-toe` match server-side
4. Both players join the match and receive their symbol (X or O)
5. Players take turns sending moves (op_code 1) — server validates and broadcasts board state
6. Server detects win/draw and broadcasts result (op_code 1 with winner field)
7. If a player disconnects, the other player is notified (op_code 4)

### Op Codes
| Code | Description |
|------|-------------|
| 1 | Board state update (board + currentPlayer + winner) |
| 3 | Game start (player symbol assignments) |
| 4 | Opponent left the game |

### Matchmaking
Uses Nakama's built-in matchmaker with a registered `matchmakerMatched` hook that creates an authoritative match — ensuring all game logic runs server-side.

---

## Setup & Installation (Local)

### Prerequisites
- Docker Desktop
- Node.js 18+
- npm

### Steps

**1. Clone the repository:**
```bash
git clone https://github.com/Mahesh741/nakama-tictactoe.git
cd nakama-tictactoe
```

**2. Compile the TypeScript backend module:**
```bash
npm install
npx tsc
```

**3. Start Nakama + PostgreSQL:**
```bash
docker-compose up --build
```

Nakama will be available at `http://localhost:7350`

**4. Install and run the frontend:**
```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

> **Note:** For local development, make sure `App.jsx` line 4 uses `127.0.0.1` and port `7350` with SSL `false`.

---

## How to Test Multiplayer

### Using the Live Deployed Version
1. Open https://frontend-phi-two-45.vercel.app in **two browser tabs**
2. Enter a username in each tab
3. Click **"Find Random Match"** in both tabs
4. The matchmaker will pair the two players automatically (usually within 5 seconds)
5. The game starts — players take turns clicking cells

### Using Local Development
1. Run docker-compose and frontend as described above
2. Open `http://localhost:5173` in two tabs
3. Follow the same steps above

### Manual Match (for testing specific scenarios)
1. Tab 1: Enter username → **Create Match** → copy the Match ID shown
2. Tab 2: Enter username → paste Match ID → **Join Match**
3. Game starts when both players are in

---

## Deployment Process

### Backend (Railway)

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add a PostgreSQL database service
4. Add environment variable in nakama service:
   ```
   NAKAMA_DATABASE_ADDRESS=${{Postgres.PGUSER}}:${{Postgres.PGPASSWORD}}@${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}
   ```
5. The `Dockerfile` and `start.sh` handle the rest automatically
6. Expose port 7350 via Railway's public networking

### Frontend (Vercel)

```bash
cd frontend
npx vercel --prod
```

Make sure `App.jsx` uses the Railway public domain with port `443` and SSL `true`:
```js
const client = new Client("defaultkey", "your-nakama-url.railway.app", "443", true);
```

---

## Project Structure

```
nakama-tictactoe/
├── modules/
│   └── index.ts          # Server-side game logic (TypeScript)
├── build/
│   └── index.js          # Compiled JS loaded by Nakama
├── frontend/
│   └── src/
│       └── App.jsx       # React frontend (all UI + Nakama client)
├── Dockerfile            # Docker image for Railway deployment
├── start.sh              # Startup script (runs migrations + server)
├── docker-compose.yml    # Local development setup
└── tsconfig.json         # TypeScript compiler config
```

---

## API / Server Configuration

### Nakama Configuration
- **Server Key:** `defaultkey` (change for production)
- **HTTP Port:** 7350
- **gRPC Port:** 7349
- **Console Port:** 7351
- **Tick Rate:** 1 tick/second (sufficient for turn-based game)

### Registered Server Functions
| Type | Name | Description |
|------|------|-------------|
| RPC | `create_match` | Creates an authoritative tic-tac-toe match |
| Match Handler | `tic-tac-toe` | Full match lifecycle (init, join, loop, leave) |
| Matchmaker Hook | `matchmakerMatched` | Creates authoritative match when 2 players are paired |

### Game State Schema
```json
{
  "board": ["", "X", "", "", "O", "", "", "", ""],
  "players": ["userId_X", "userId_O"],
  "currentPlayer": "O",
  "gameOver": false,
  "started": true
}
```

---

## Optional Features Implemented

- **Concurrent Game Support** — Nakama handles multiple simultaneous authoritative matches with full isolation
- **Automatic Matchmaking** — Players are paired automatically without sharing match IDs
- **Graceful Disconnection Handling** — Opponent is notified when a player leaves mid-game

---

## Security

- All moves validated server-side — clients cannot cheat by sending invalid moves
- Turn enforcement — only the current player's moves are accepted
- Cell validation — already-filled cells are rejected
- Match capacity — maximum 2 players per match enforced in `matchJoinAttempt`