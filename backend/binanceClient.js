const WebSocket = require('ws');
const config = require('./config');
const logger = require('./logger');
const { normalise } = require('./normaliser');
const dataStore = require('./dataStore');
const broadcaster = require('./broadcaster');

//   Format: wss://…/stream?streams=btcusdt@aggTrade/btcusdt@ticker/…
function buildStreamUrl() {
  const streams = [];
  config.SYMBOLS.forEach((symbol) => {
    config.STREAMS.forEach((stream) => {
      streams.push(`${symbol}@${stream}`);
    });
  });
  const url = `${config.BINANCE_WS_BASE}?streams=${streams.join('/')}`;
  logger.info('BINANCE', `Stream URL built (${streams.length} streams for ${config.SYMBOLS.length} symbols)`);
  return url;
}

const lastBroadcastTime = {};

function isThrottled(symbol) {
  const now = Date.now();
  if (
    !lastBroadcastTime[symbol] ||
    now - lastBroadcastTime[symbol] >= config.DATA.TRADE_THROTTLE_MS
  ) {
    lastBroadcastTime[symbol] = now;
    return false;
  }
  return true;
}

let binanceWs = null;
let reconnectAttempt = 0;
let reconnectTimer = null;
let isShuttingDown = false;

function connect() {
  if (isShuttingDown) return;

  const url = buildStreamUrl();
  logger.info('BINANCE', `Connecting (attempt ${reconnectAttempt + 1})…`);

  binanceWs = new WebSocket(url, {
    handshakeTimeout: 10000,  // fail fast if Binance is unreachable
  });

  binanceWs.on('open', () => {
    reconnectAttempt = 0;
    logger.success('BINANCE', '✓ Connected to Binance WebSocket');
    logger.info(
      'BINANCE',
      `Symbols: ${config.SYMBOLS.map(s => s.toUpperCase()).join(' | ')}  ` +
      `Streams: ${config.STREAMS.join(' | ')}`
    );

    broadcaster.broadcastAll({ type: 'status', status: 'connected', source: 'binance', ts: Date.now() });
  });

  binanceWs.on('message', (raw) => {
    try {
      const packet = JSON.parse(raw.toString());

      const { stream, data } = packet;
      if (!stream || !data) return;

      const normalised = normalise(stream, data);
      if (!normalised) return;

      switch (normalised.type) {

        case 'trade':
          dataStore.addTrade(normalised);
          if (!isThrottled(normalised.symbol)) {
            broadcaster.broadcast(normalised);
          }
          break;

        case 'ticker':
          dataStore.updateTicker(normalised);
          broadcaster.broadcast(normalised);
          break;

        case 'kline':
          dataStore.updateKline(normalised);
          if (!isThrottled(normalised.symbol + '_kline')) {
            broadcaster.broadcast(normalised);
          }
          break;
      }

    } catch (err) {
      logger.error('BINANCE', `Message parse error: ${err.message}`);
    }
  });

  binanceWs.on('ping', (data) => {
    binanceWs.pong(data);
  });

  binanceWs.on('close', (code, reason) => {
    logger.warn('BINANCE', `Connection closed  code=${code}  reason=${reason?.toString() || 'none'}`);
    broadcaster.broadcastAll({ type: 'status', status: 'reconnecting', source: 'binance', ts: Date.now() });
    scheduleReconnect();
  });

  binanceWs.on('error', (err) => {
    logger.error('BINANCE', `WebSocket error: ${err.message}`);
  });
}

function scheduleReconnect() {
  if (isShuttingDown) return;

  reconnectAttempt++;

  if (reconnectAttempt > config.RECONNECT.MAX_ATTEMPTS) {
    logger.error('BINANCE', `Max reconnect attempts (${config.RECONNECT.MAX_ATTEMPTS}) reached. Giving up.`);
    return;
  }

  const base = config.RECONNECT.INITIAL_DELAY * Math.pow(config.RECONNECT.MULTIPLIER, reconnectAttempt - 1);
  const capped = Math.min(base, config.RECONNECT.MAX_DELAY);
  const jitter = Math.random() * 1000;
  const delay = Math.round(capped + jitter);

  logger.warn('BINANCE', `Reconnecting in ${delay} ms  (attempt ${reconnectAttempt}/${config.RECONNECT.MAX_ATTEMPTS})`);

  reconnectTimer = setTimeout(connect, delay);
}

function disconnect() {
  isShuttingDown = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (binanceWs) binanceWs.terminate();
  logger.warn('BINANCE', 'Disconnected from Binance');
}

function getStatus() {
  return {
    connected: binanceWs?.readyState === WebSocket.OPEN,
    reconnectAttempt,
    symbols: config.SYMBOLS.map(s => s.toUpperCase()),
    streams: config.STREAMS,
  };
}

module.exports = { connect, disconnect, getStatus };