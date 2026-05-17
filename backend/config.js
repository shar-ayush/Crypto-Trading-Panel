module.exports = {
  SERVER_PORT: 8080,

  BINANCE_WS_BASE: 'wss://stream.binance.com:9443/stream',

  SYMBOLS: ['btcusdt', 'ethusdt', 'bnbusdt', 'solusdt'],

  STREAMS: ['aggTrade', 'ticker', 'kline_1m'],

  RECONNECT: {
    INITIAL_DELAY: 2000,   // ms before first retry
    MAX_DELAY: 30000,   // cap at 30 s
    MULTIPLIER: 1.5,   // delay *= multiplier each attempt
    MAX_ATTEMPTS: 20,   // give up after this many tries
  },

  CLIENT: {
    HEARTBEAT_INTERVAL: 25000,  // ping every 25 s
    HEARTBEAT_TIMEOUT: 10000,  // kill if no pong within 10 s
  },

  DATA: {
    MAX_TRADE_HISTORY: 500,   // rolling price points kept per symbol
    MAX_KLINE_HISTORY: 200,   // candles kept per symbol
    TRADE_THROTTLE_MS: 150,   // max 1 trade broadcast per 150 ms per symbol
    // (aggTrade fires every few ms — throttle saves bandwidth)
  },
};