export const WS_URL = 'ws://172.16.219.165:8080/ws';

export const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'] as const;
export type SymbolType = (typeof SYMBOLS)[number];

export const SYMBOL_LABELS: Record<SymbolType, string> = {
  BTCUSDT: 'BTC',
  ETHUSDT: 'ETH',
  BNBUSDT: 'BNB',
  SOLUSDT: 'SOL',
};

export const SYMBOL_NAMES: Record<SymbolType, string> = {
  BTCUSDT: 'Bitcoin',
  ETHUSDT: 'Ethereum',
  BNBUSDT: 'BNB Chain',
  SOLUSDT: 'Solana',
};