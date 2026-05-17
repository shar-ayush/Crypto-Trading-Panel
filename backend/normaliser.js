function normaliseAggTrade(data) {
  return {
    type: 'trade',
    symbol: data.s,
    price: parseFloat(data.p),
    quantity: parseFloat(data.q),
    side: data.m ? 'sell' : 'buy',
    tradeId: data.a,
    timestamp: data.T,
    eventTime: data.E,
  };
}

function normaliseTicker(data) {
  return {
    type: 'ticker',
    symbol: data.s,
    lastPrice: parseFloat(data.c),
    priceChangePct: parseFloat(data.P),
    highPrice: parseFloat(data.h),
    lowPrice: parseFloat(data.l),
    openPrice: parseFloat(data.o),
    weightedAvgPrice: parseFloat(data.w),
    volume: parseFloat(data.v),
    quoteVolume: parseFloat(data.q),
    bidPrice: parseFloat(data.b),
    askPrice: parseFloat(data.a),
    totalTrades: data.n,
    timestamp: data.E,
  };
}


function normaliseKline(data) {
  const k = data.k;
  return {
    type: 'kline',
    symbol: data.s,
    interval: k.i,
    open: parseFloat(k.o),
    high: parseFloat(k.h),
    low: parseFloat(k.l),
    close: parseFloat(k.c),
    volume: parseFloat(k.v),
    isClosed: k.x,
    openTime: k.t,
    closeTime: k.T,
    trades: k.n,
    timestamp: data.E,
  };
}

function normalise(streamName, data) {
  const eventType = data.e;

  switch (eventType) {
    case 'aggTrade': return normaliseAggTrade(data);
    case '24hrTicker': return normaliseTicker(data);
    case 'kline': return normaliseKline(data);
    default:
      return null;
  }
}

module.exports = { normalise };