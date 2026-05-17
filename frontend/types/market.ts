export type TradeMessage = {
  type: 'trade';
  symbol: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  tradeId: number;
  timestamp: number;
  eventTime: number;
};

export type TickerMessage = {
  type: 'ticker';
  symbol: string;
  lastPrice: number;
  priceChange: number;
  priceChangePct: number;
  highPrice: number;
  lowPrice: number;
  openPrice: number;
  weightedAvgPrice: number;
  volume: number;
  quoteVolume: number;
  bidPrice: number;
  askPrice: number;
  totalTrades: number;
  timestamp: number;
};

export type KlineMessage = {
  type: 'kline';
  symbol: string;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
  openTime: number;
  closeTime: number;
  trades: number;
  timestamp: number;
};

export type SnapshotMessage = {
  type: 'snapshot';
  symbol: string;
  trades: Array<{
    price: number;
    quantity: number;
    side: 'buy' | 'sell';
    timestamp: number;
  }>;
  ticker: Omit<TickerMessage, 'type'> | null;
  klines: Array<Omit<KlineMessage, 'type'>>;
};

export type StatusMessage = {
  type: 'status';
  status: 'connected' | 'reconnecting' | 'disconnected';
  source: string;
  ts: number;
};

export type PongMessage = {
  type: 'pong';
  timestamp: number;
};

export type ServerMessage =
  | TradeMessage
  | TickerMessage
  | KlineMessage
  | SnapshotMessage
  | StatusMessage
  | PongMessage;


export type ChartPoint = {
  x: number;
  y: number;
  timestamp: number;
};