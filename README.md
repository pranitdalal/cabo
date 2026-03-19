# Cabo — Multiplayer Card Game

## Quick Start

### 1. Install dependencies (from repo root)
```bash
npm install
```

### 2. Run in development (both server + client)
```bash
npm run dev
```

Or run separately:
```bash
# Terminal 1 — WebSocket server (port 3001)
npm run dev --workspace=apps/server

# Terminal 2 — Next.js client (port 3000)
npm run dev --workspace=apps/client
```

### 3. Open
- `http://localhost:3000` — create or join a room
- Share the room URL to invite friends

---

## How to Play

1. **Create a room** — enter your name and click "Create Room"
2. **Share the URL** — copy and send to friends
3. **Ready up** — non-host players click "Ready Up"
4. **Host starts** — once everyone is ready, host clicks "Start Game"
5. **Peek phase** — click 2 of your 4 face-down cards to secretly peek, then click "Done Peeking"
6. **Take turns** — click the deck or discard pile to draw, then swap or discard
7. **Special cards**:
   - 7/8 → peek at one of your own cards
   - 9/10 → peek at an opponent's card
   - J/Q → blind swap with an opponent
   - K → spy an opponent's card, optionally swap
8. **Call CABO** — when you think you have the lowest total, call CABO instead of drawing
9. **Scoring** — everyone else gets one more turn, then cards are revealed
   - Cabo caller gets +10 penalty if they don't have the lowest score
   - Player who reaches 100+ points is eliminated
   - Last player standing wins

## Card Values
| Card | Value |
|------|-------|
| Joker | −2 |
| Ace | 1 |
| 2–6 | face value |
| 7–10 | face value |
| J | 11 |
| Q | 12 |
| Red K | 0 |
| Black K | 13 |

## Project Structure
```
cabo/
├── apps/
│   ├── client/     # Next.js 14 + Tailwind + Framer Motion
│   └── server/     # Express + Socket.io game server
└── packages/
    └── shared/     # Shared TypeScript types
```
