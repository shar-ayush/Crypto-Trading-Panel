# Real-Time Crypto Trading Panel

A full-stack, real-time cryptocurrency trading panel inspired by Binance and Robinhood.
Streams live market data from the **Binance WebSocket API**, processes it through a
custom Node.js relay server, and presents it in a clean React Native trading interface
complete with live charts, crosshair interaction, and a trade panel.

---

## Quick Start

### Prerequisites
- Node.js 18+
- Expo Go app on your phone (iOS or Android)
- Both your PC and phone on the same Wi-Fi network

### 1 — Start the Backend

```bash
cd backend
npm install
node server.js
```

Expected output:
```
✓ [SERVER]    CryptoApp Backend — Online
✓ [SERVER]    REST  →  http://localhost:8080
✓ [SERVER]    WS    →  ws://localhost:8080/ws
✓ [BINANCE]   ✓ Connected to Binance WebSocket
```

### 2 — Configure Frontend IP

```bash
# Windows — find your local IP
ipconfig
# Look for IPv4 Address e.g. 192.168.1.45
```

Open `frontend/constants/config.ts` and set:
```ts
export const WS_URL = 'ws://192.168.1.45:8080/ws';
```

### 3 — Start the Frontend

```bash
cd frontend
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone.

---

## Project Structure

```
CryptoApp/
│
├── backend/                        # Node.js WebSocket relay server
│   ├── server.js                   # Entry point — HTTP + WebSocket server
│   ├── binanceClient.js            # Connects to Binance public streams
│   ├── broadcaster.js              # Manages all frontend WS clients
│   ├── normaliser.js               # Cleans raw Binance payloads
│   ├── dataStore.js                # In-memory market data buffer
│   ├── config.js                   # All constants in one place
│   ├── logger.js                   # Colour-coded terminal logger
│   └── package.json
│
├── frontend/                       # React Native Expo app
│   ├── app/
│   │   ├── _layout.tsx             # Root navigator
│   │   ├── +not-found.tsx
│   │   └── (tabs)/
│   │       ├── _layout.tsx         # Tab navigator (tab bar hidden)
│   │       └── index.tsx           # Main trading screen
│   ├── components/
│   │   ├── ConnectionBanner.tsx    # Reconnecting indicator
│   │   ├── Header.tsx              # Symbol tabs + live dot
│   │   ├── PriceDisplay.tsx        # Large price + 24h stats
│   │   ├── PriceChart.tsx          # Real-time chart + crosshair
│   │   └── TradePanel.tsx          # Buy/Sell UI
│   ├── hooks/
│   │   └── useWebSocket.ts         # WS client + reconnection logic
│   ├── store/
│   │   └── useMarketStore.ts       # Zustand global state
│   ├── types/
│   │   └── market.ts               # TypeScript interfaces
│   └── constants/
│       ├── config.ts               # WS URL + symbol config
│       └── theme.ts                # Design tokens
│
└── docs/
    ├── ARCHITECTURE.md             # System design + data flow
    ├── BACKEND.md                  # Backend deep-dive
    ├── FRONTEND.md                 # Frontend deep-dive
    ├── REALTIME_DATA.md            # End-to-end data journey
    └── DESIGN_DECISIONS.md         # Why each technology was chosen
```

---

## Features

| Feature | Detail |
|---|---|
| **Live price** | Updates every ~150ms via WebSocket |
| **8 timeframes** | 1s · 1m · 15m · 1h · 4h · 1D · 1W · 1M |
| **1s live chart** | Builds in real-time from WebSocket trade stream |
| **Historical charts** | Fetched from Binance REST API per timeframe |
| **Crosshair touch** | Drag chart to see price + timestamp at any point |
| **4 symbols** | BTC · ETH · BNB · SOL with instant switching |
| **Trade panel** | Buy/Sell with Market/Limit orders + review modal |
| **Auto-reconnect** | Exponential back-off on both backend and frontend |
| **Snapshot on connect** | New clients get chart history immediately |

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Backend runtime | Node.js | Non-blocking I/O — ideal for WebSocket relay |
| Backend WS library | `ws` | Lightweight, no overhead vs Socket.IO |
| Backend HTTP | Express | REST endpoints for health + history |
| Frontend framework | React Native + Expo | Cross-platform, managed workflow |
| Frontend state | Zustand | Minimal boilerplate, reactive slices |
| Charting | Victory Native | SVG-based, works in Expo managed workflow |
| Data source | Binance Public WS | Free, no API key, real market data |

---

## REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server status, uptime, connected clients |
| `GET` | `/api/symbols` | Available trading pairs |
| `GET` | `/api/tickers` | Current 24hr stats for all symbols |
| `GET` | `/api/history/:symbol` | Buffered trade history snapshot |



## Why `ws` over Socket.IO?

Socket.IO is excellent but adds overhead we don't need:
- Fallback transports (long-polling, XHR) — not needed; all clients support WebSocket
- Rooms and namespaces — we implement our own subscription model
- ~60 KB of extra client-side JS

The `ws` library is the thin wrapper over the raw WebSocket protocol. Binance speaks standard WebSocket; so does `ws`. No translation layer, no extra latency.

## Why aggTrade + ticker + kline_1m streams?

| Stream | Frequency | Purpose |
|--------|-----------|---------|
| `aggTrade` | Every trade (~ms) | Live price, chart data |
| `24hrTicker` | ~1/second | Price change %, high/low |
| `kline_1m` | Every trade (within window) | Candlestick chart |

Using the combined stream endpoint (`/stream?streams=a/b/c`) opens **one** WebSocket connection to Binance instead of one per stream — critical for staying within connection limits.

## Data Normalisation Strategy

Raw Binance payloads use single-character keys (`p`, `q`, `m`, `T`) to minimise bandwidth on their end. We expand them **once** in `normaliser.js` on the server — every downstream consumer (REST, WebSocket, store) gets clean, human-readable objects. This keeps frontend code simple and decoupled from Binance's API format.

## Throttling

`aggTrade` fires multiple times per second for BTC. Broadcasting every single event to mobile clients would:
1. Drain battery faster
2. Overwhelm the React Native renderer
3. Cause dropped frames on the chart animation

We store every tick in `dataStore.js` (full fidelity) but only broadcast at most once per 150 ms per symbol. The frontend chart still updates ~6× per second — more than fast enough for humans.

## In-Memory Store + Snapshot Pattern

When a frontend client connects mid-session, the chart would be empty if we only sent live ticks. Instead:
1. Server accumulates up to 500 trade points per symbol in memory
2. On connect, `broadcaster.addClient()` immediately sends a `snapshot` message containing all buffered data
3. Client populates the chart from snapshot, then appends live ticks

This pattern is called **event sourcing with a snapshot** — the same technique used by Kafka consumers.

## Exponential Back-off Reconnection

If the Binance connection drops, retrying immediately would spam their servers and risk an IP ban. Instead:
- Attempt 1: wait 2 s
- Attempt 2: wait 3 s
- Attempt 3: wait 4.5 s
- ... capped at 30 s

Plus random jitter (0–1 s) to avoid "thundering herd" — multiple server instances all retrying at the exact same millisecond.

## Heartbeat (Ping / Pong)

TCP connections can silently die (mobile network switch, NAT timeout, carrier firewall). The server pings every frontend client every 25 seconds. If no pong returns within the next ping cycle, the connection is terminated and removed. Without this, dead sockets accumulate and broadcast calls silently fail.

## Frontend: Why Zustand over Redux?

Redux requires actions → reducers → dispatch → selectors — ~100 lines of boilerplate for a store this small. Zustand's entire store is ~20 lines. It integrates directly with React hooks, works in React Native, and its `subscribeWithSelector` middleware lets chart components subscribe to only the data slice they need, preventing unnecessary re-renders.




