const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const config = require('./config');
const logger = require('./logger');
const binanceClient = require('./binanceClient');
const broadcaster = require('./broadcaster');
const dataStore = require('./dataStore');

const app = express();

app.use(cors());
app.use(express.json());


app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: `${Math.floor(process.uptime())}s`,
    memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
    timestamp: new Date().toISOString(),
    binance: binanceClient.getStatus(),
    ...broadcaster.getStats(),
  });
});

// which coins the server is tracking
app.get('/api/symbols', (req, res) => {
  res.json({
    symbols: config.SYMBOLS.map(s => s.toUpperCase()),
    streams: config.STREAMS,
  });
});

//  snapshot of stored data 
app.get('/api/history/:symbol', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const validSymbols = config.SYMBOLS.map(s => s.toUpperCase());

  if (!validSymbols.includes(symbol)) {
    return res.status(400).json({ error: `Unknown symbol. Valid: ${validSymbols.join(', ')}` });
  }

  res.json(dataStore.getSnapshot(symbol));
});

//  current 24hr stats for all symbols
app.get('/api/tickers', (req, res) => {
  res.json(dataStore.getAllTickers());
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', availableRoutes: ['/health', '/api/symbols', '/api/history/:symbol', '/api/tickers'] });
});

const server = http.createServer(app);

//  WebSocket server 
//   path: '/ws'  — so REST and WS coexist on same port
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress || 'unknown';
  logger.info('SERVER', `New frontend connection from ${ip}`);
  broadcaster.addClient(ws);
});

wss.on('error', (err) => {
  logger.error('SERVER', `WebSocket server error: ${err.message}`);
});

server.listen(config.SERVER_PORT, () => {
  console.log('');
  logger.success('SERVER', '    CryptoApp Backend  —  Online');
  logger.success('SERVER', `    REST  →  http://localhost:${config.SERVER_PORT}`);
  logger.success('SERVER', `    WS    →  ws://localhost:${config.SERVER_PORT}/ws`);
  console.log('');

  broadcaster.startHeartbeat();

  binanceClient.connect();
});


process.on('SIGINT', () => {
  logger.warn('SERVER', 'SIGINT received — shutting down...');
  binanceClient.disconnect();
  server.close(() => {
    logger.warn('SERVER', 'HTTP server closed.');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  logger.error('SERVER', `Uncaught exception: ${err.message}`);
  logger.error('SERVER', err.stack);
});

process.on('unhandledRejection', (reason) => {
  logger.error('SERVER', `Unhandled promise rejection: ${reason}`);
});