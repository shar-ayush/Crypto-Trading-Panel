import { create } from 'zustand';
import {
  TradeMessage, TickerMessage, KlineMessage,
  SnapshotMessage, ChartPoint,
} from '../types/market';

const MAX_CHART_POINTS = 120;

type SymbolData = {
  chartPoints: ChartPoint[];
  currentPrice: number;
  previousPrice: number;
  lastSide: 'buy' | 'sell';
  ticker: Omit<TickerMessage, 'type'> | null;
  klines: Array<Omit<KlineMessage, 'type'>>;
};

type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

type MarketState = {
  activeSymbol: string;
  symbolData: Record<string, SymbolData>;
  connectionStatus: ConnectionStatus;

  setActiveSymbol: (symbol: string) => void;
  addTrade: (trade: TradeMessage) => void;
  updateTicker: (ticker: TickerMessage) => void;
  updateKline: (kline: KlineMessage) => void;
  applySnapshot: (snap: SnapshotMessage) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
};

const emptySymbolData = (): SymbolData => ({
  chartPoints: [],
  currentPrice: 0,
  previousPrice: 0,
  lastSide: 'buy',
  ticker: null,
  klines: [],
});

export const useMarketStore = create<MarketState>((set) => ({
  activeSymbol: 'BTCUSDT',
  symbolData: {},
  connectionStatus: 'disconnected',

  setActiveSymbol: (symbol) => set({ activeSymbol: symbol }),

  addTrade: (trade) =>
    set((state) => {
      const sym = trade.symbol;
      const existing = state.symbolData[sym] ?? emptySymbolData();

      const newPoint: ChartPoint = {
        x: existing.chartPoints.length,
        y: trade.price,
        timestamp: trade.timestamp,
      };

      const chartPoints = [...existing.chartPoints, newPoint].slice(-MAX_CHART_POINTS);

      return {
        symbolData: {
          ...state.symbolData,
          [sym]: {
            ...existing,
            chartPoints,
            previousPrice: existing.currentPrice || trade.price,
            currentPrice: trade.price,
            lastSide: trade.side,
          },
        },
      };
    }),

  updateTicker: (ticker) =>
    set((state) => {
      const sym = ticker.symbol;
      const existing = state.symbolData[sym] ?? emptySymbolData();
      const { type, ...td } = ticker;
      return {
        symbolData: {
          ...state.symbolData,
          [sym]: { ...existing, ticker: td },
        },
      };
    }),

  updateKline: (kline) =>
    set((state) => {
      const sym = kline.symbol;
      const existing = state.symbolData[sym] ?? emptySymbolData();
      const klines = [...existing.klines];
      const { type, ...kd } = kline;
      const last = klines[klines.length - 1];

      if (last && last.openTime === kd.openTime) {
        klines[klines.length - 1] = kd;
      } else {
        klines.push(kd);
        if (klines.length > 200) klines.shift();
      }

      return {
        symbolData: {
          ...state.symbolData,
          [sym]: { ...existing, klines },
        },
      };
    }),

  applySnapshot: (snap) =>
    set((state) => {
      const sym = snap.symbol;

      const chartPoints: ChartPoint[] = snap.trades
        .map((t, idx) => ({
          x: idx,
          y: t.price,
          timestamp: t.timestamp,
        }))
        .slice(-MAX_CHART_POINTS);

      const lastTrade = snap.trades[snap.trades.length - 1];

      return {
        symbolData: {
          ...state.symbolData,
          [sym]: {
            chartPoints,
            currentPrice: lastTrade?.price ?? 0,
            previousPrice: 0,
            lastSide: lastTrade?.side ?? 'buy',
            ticker: snap.ticker,
            klines: snap.klines.slice(-200),
          },
        },
      };
    }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),
}));

const EMPTY_DATA = emptySymbolData();

export const selectCurrentPrice = (s: MarketState) =>
  (s.symbolData[s.activeSymbol] ?? EMPTY_DATA).currentPrice;

export const selectTicker = (s: MarketState) =>
  (s.symbolData[s.activeSymbol] ?? EMPTY_DATA).ticker;

export const selectChartPoints = (s: MarketState) =>
  (s.symbolData[s.activeSymbol] ?? EMPTY_DATA).chartPoints;

export const selectLastSide = (s: MarketState) =>
  (s.symbolData[s.activeSymbol] ?? EMPTY_DATA).lastSide;