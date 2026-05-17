const config = require('./config');

const store = {
  tradeHistory: {},  // rolling window of recent trades per symbol
  tickers: {},  // latest 24hr ticker per symbol
  klines: {},  // rolling window of candles per symbol
};

function addTrade(trade) {
  const sym = trade.symbol;
  if (!store.tradeHistory[sym]) store.tradeHistory[sym] = [];

  store.tradeHistory[sym].push({
    price: trade.price,
    quantity: trade.quantity,
    side: trade.side,
    timestamp: trade.timestamp,
  });

  if (store.tradeHistory[sym].length > config.DATA.MAX_TRADE_HISTORY) {
    store.tradeHistory[sym].shift();
  }
}

function updateTicker(ticker) {
  store.tickers[ticker.symbol] = ticker;
}

function updateKline(kline) {
  const sym = kline.symbol;
  if (!store.klines[sym]) store.klines[sym] = [];

  const arr = store.klines[sym];
  const last = arr[arr.length - 1];

  if (last && last.openTime === kline.openTime) {
    arr[arr.length - 1] = kline;
  } else {
    arr.push(kline);
    if (arr.length > config.DATA.MAX_KLINE_HISTORY) arr.shift();
  }
}

function getSnapshot(symbol) {
  const sym = symbol.toUpperCase();
  return {
    type: 'snapshot',
    symbol: sym,
    trades: store.tradeHistory[sym] || [],
    ticker: store.tickers[sym] || null,
    klines: store.klines[sym] || [],
  };
}

function getAllTickers() {
  return store.tickers;
}

function getTradeHistory(symbol) {
  return store.tradeHistory[symbol.toUpperCase()] || [];
}

module.exports = { addTrade, updateTicker, updateKline, getSnapshot, getAllTickers, getTradeHistory };