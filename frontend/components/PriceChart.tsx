// 1s = live WebSocket data (no REST fetch, updates every tick)
// All other timeframes = Binance REST kline API

import React, {
  useState, useEffect, useCallback,
  useMemo, useRef,
} from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, ActivityIndicator, ScrollView,
  PanResponder, Animated,
} from 'react-native';
import { VictoryArea, VictoryChart, VictoryAxis } from 'victory-native';
import {
  useMarketStore, selectTicker, selectChartPoints,
} from '../store/useMarketStore';
import { theme } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 200;
const CHART_PAD_TOP = 12;
const CHART_PAD_BOTTOM = 10;
const CHART_TOTAL_H = CHART_HEIGHT + 20;
const CHART_AREA_H = CHART_TOTAL_H - CHART_PAD_TOP - CHART_PAD_BOTTOM;

type Timeframe = '1s' | '1m' | '15m' | '1h' | '4h' | '1D' | '1W' | '1M';

type TFConfig = {
  interval: string;
  limit: number;
  label: string;
  isLive: boolean;   // true = use WebSocket store, skip REST
};

const TF_CONFIG: Record<Timeframe, TFConfig> = {
  '1s': { interval: '', limit: 0, label: 'Real-time (live)', isLive: true },
  '1m': { interval: '1m', limit: 120, label: 'Past 2 hours', isLive: false },
  '15m': { interval: '15m', limit: 96, label: 'Past 24 hours', isLive: false },
  '1h': { interval: '1h', limit: 168, label: 'Past 1 week', isLive: false },
  '4h': { interval: '4h', limit: 180, label: 'Past 1 month', isLive: false },
  '1D': { interval: '1d', limit: 365, label: 'Past 1 year', isLive: false },
  '1W': { interval: '1w', limit: 104, label: 'Past 2 years', isLive: false },
  '1M': { interval: '1M', limit: 60, label: 'Past 5 years', isLive: false },
};

const TIMEFRAMES = Object.keys(TF_CONFIG) as Timeframe[];

// Candle shape (used for all display data) 
type Candle = { x: number; y: number; timestamp: number };

// Timestamp formatter
function formatTs(ts: number, tf: Timeframe): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const date = `${months[d.getMonth()]} ${d.getDate()}`;
  const year = d.getFullYear();

  switch (tf) {
    case '1s': return time;                       // HH:MM:SS
    case '1m': return time.slice(0, 5);           // HH:MM
    case '15m': case '1h':
    case '4h': return `${date}  ${time.slice(0, 5)}`;
    case '1D': case '1W': return `${date}, ${year}`;
    case '1M': return `${months[d.getMonth()]} ${year}`;
  }
}

// Binance REST kline fetch 
async function fetchKlines(symbol: string, interval: string, limit: number): Promise<Candle[]> {
  const url =
    `https://api.binance.com/api/v3/klines` +
    `?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw: any[][] = await res.json();
  return raw.map((c, idx) => ({
    x: idx,
    y: parseFloat(c[4]),  // close price
    timestamp: c[0],              // openTime ms
  }));
}

export function PriceChart() {
  const [selectedTF, setSelectedTF] = useState<Timeframe>('1s');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touchInfo, setTouchInfo] = useState<{
    index: number; crosshairX: number;
  } | null>(null);

  // Pulsing animation for the LIVE dot
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const ticker = useMarketStore(selectTicker);
  const currentPrice = useMarketStore((s) => s.symbolData[s.activeSymbol]?.currentPrice ?? 0);
  // Live chart points from WebSocket (used in 1s mode)
  const livePoints = useMarketStore(selectChartPoints);

  const isLive = TF_CONFIG[selectedTF].isLive;
  const isPositive = (ticker?.priceChangePct ?? 0) >= 0;
  const lineColor = isPositive ? theme.colors.green : theme.colors.red;

  // ── Pulsing LIVE dot ──────────────────────────────────────────
  useEffect(() => {
    if (!isLive) { pulseAnim.setValue(1); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isLive]);

  // ── Fetch historical klines (skipped in 1s mode) ──────────────
  const loadCandles = useCallback(async () => {
    if (isLive) return;
    setLoading(true);
    setError(null);
    setTouchInfo(null);
    try {
      const { interval, limit } = TF_CONFIG[selectedTF];
      const data = await fetchKlines(activeSymbol, interval, limit);
      setCandles(data);
    } catch (e: any) {
      console.error('[Chart]', e.message);
      setError('Could not load chart data.\nCheck your connection.');
    } finally {
      setLoading(false);
    }
  }, [activeSymbol, selectedTF, isLive]);

  useEffect(() => {
    setTouchInfo(null);
    if (isLive) {
      setCandles([]);
      setLoading(false);
      setError(null);
    } else {
      loadCandles();
    }
  }, [loadCandles, isLive]);

  // 1s mode  → use live WebSocket points directly (auto-updates)
  // All else → historical candles + live price merged into last candle
  const displayData = useMemo<Candle[]>(() => {
    if (isLive) {
      return livePoints.map((pt, idx) => ({
        x: idx,
        y: pt.y,
        timestamp: pt.timestamp,
      }));
    }
    if (candles.length === 0 || currentPrice === 0) return candles;
    const updated = [...candles];
    updated[updated.length - 1] = {
      ...updated[updated.length - 1],
      y: currentPrice,
    };
    return updated;
  }, [isLive, livePoints, candles, currentPrice]);

  //  Y-domain 
  const domain = useMemo((): { y: [number, number] } => {
    if (displayData.length === 0) return { y: [0, 1] };
    const prices = displayData.map((d) => d.y);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.1 || min * 0.005 || 1;
    return { y: [min - pad, max + pad] };
  }, [displayData]);

  //  % change across this timeframe window 
  const tfChange = useMemo(() => {
    if (displayData.length < 2) return null;
    const open = displayData[0].y;
    const close = displayData[displayData.length - 1].y;
    const diff = close - open;
    const pct = (diff / open) * 100;
    return { diff, pct, positive: diff >= 0 };
  }, [displayData]);

  //  Price → pixel Y (for crosshair dot) 
  const priceToPixelY = useCallback(
    (price: number) => {
      const [minP, maxP] = domain.y;
      const ratio = (price - minP) / (maxP - minP);
      return CHART_PAD_TOP + CHART_AREA_H * (1 - ratio);
    },
    [domain],
  );

  //  PanResponder (stable ref — reads displayData via ref) 
  const displayDataRef = useRef<Candle[]>([]);
  useEffect(() => { displayDataRef.current = displayData; }, [displayData]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,

      onPanResponderGrant: (e) => {
        const data = displayDataRef.current;
        if (data.length < 2) return;
        const ratio = Math.max(0, Math.min(e.nativeEvent.locationX / SCREEN_WIDTH, 1));
        const index = Math.round(ratio * (data.length - 1));
        const crosshairX = (index / (data.length - 1)) * SCREEN_WIDTH;
        setTouchInfo({ index, crosshairX });
      },
      onPanResponderMove: (e) => {
        const data = displayDataRef.current;
        if (data.length < 2) return;
        const ratio = Math.max(0, Math.min(e.nativeEvent.locationX / SCREEN_WIDTH, 1));
        const index = Math.round(ratio * (data.length - 1));
        const crosshairX = (index / (data.length - 1)) * SCREEN_WIDTH;
        setTouchInfo({ index, crosshairX });
      },
      onPanResponderRelease: () => setTouchInfo(null),
      onPanResponderTerminate: () => setTouchInfo(null),
    })
  ).current;

  const touchedCandle = touchInfo !== null ? displayData[touchInfo.index] : null;
  const dotY = touchedCandle ? priceToPixelY(touchedCandle.y) : 0;
  const showTouchInfo = touchedCandle !== null && !loading;

  return (
    <View style={styles.wrapper}>

      {/*  Info row: LIVE indicator / % change / touched price */}
      <View style={styles.infoRow}>
        {showTouchInfo ? (
          // Touched candle info
          <>
            <Text style={styles.touchPrice}>
              ${touchedCandle!.y.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            <Text style={styles.touchTime}>
              {formatTs(touchedCandle!.timestamp, selectedTF)}
            </Text>
          </>
        ) : isLive ? (
          // Live mode header
          <View style={styles.liveRow}>
            <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
            <Text style={styles.liveLabel}>LIVE</Text>
            {tfChange && (
              <Text style={[
                styles.livePct,
                { color: tfChange.positive ? theme.colors.green : theme.colors.red },
              ]}>
                {tfChange.positive ? '+' : ''}{tfChange.pct.toFixed(4)}%
              </Text>
            )}
            <Text style={styles.liveSubLabel}>
              {displayData.length} ticks
            </Text>
          </View>
        ) : (
          // Historical % change
          tfChange && !loading ? (
            <>
              <Text style={[
                styles.tfChangePct,
                { color: tfChange.positive ? theme.colors.green : theme.colors.red },
              ]}>
                {tfChange.positive ? '+' : ''}{tfChange.pct.toFixed(2)}%
              </Text>
              <Text style={styles.tfChangeLabel}>
                {TF_CONFIG[selectedTF].label}
              </Text>
            </>
          ) : null
        )}
      </View>

      {/*  Chart area  */}
      <View style={styles.chartBox}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.green} size="small" />
            <Text style={styles.hintText}>Loading {selectedTF} chart…</Text>
          </View>

        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadCandles}>
              <Text style={styles.retryText}>Tap to Retry</Text>
            </TouchableOpacity>
          </View>

        ) : displayData.length >= 2 ? (
          <View style={StyleSheet.absoluteFill}>

            {/* Victory chart */}
            <VictoryChart
              width={SCREEN_WIDTH}
              height={CHART_TOTAL_H}
              padding={{ top: CHART_PAD_TOP, bottom: CHART_PAD_BOTTOM, left: 0, right: 0 }}
              domain={domain}
            >
              <VictoryAxis
                dependentAxis
                tickCount={4}
                style={{
                  axis: { stroke: 'transparent' },
                  ticks: { stroke: 'transparent' },
                  tickLabels: { fill: 'transparent' },
                  grid: {
                    stroke: theme.colors.border,
                    strokeOpacity: 0.5,
                    strokeDasharray: '2,8',
                    strokeWidth: 1,
                  },
                }}
              />
              <VictoryAxis
                style={{
                  axis: { stroke: 'transparent' },
                  ticks: { stroke: 'transparent' },
                  tickLabels: { fill: 'transparent' },
                  grid: { stroke: 'transparent' },
                }}
              />
              <VictoryArea
                data={displayData}
                interpolation="monotoneX"
                style={{
                  data: {
                    stroke: lineColor,
                    strokeWidth: 2,
                    fill: lineColor,
                    fillOpacity: 0.08,
                  },
                }}
              />
            </VictoryChart>

            {/* Crosshair overlays */}
            {touchInfo && touchedCandle && (
              <>
                <View style={[styles.crosshairLine, { left: touchInfo.crosshairX }]} />
                <View style={[styles.crosshairHLine, { top: dotY }]} />
                <View style={[
                  styles.crosshairDot,
                  { left: touchInfo.crosshairX - 5, top: dotY - 5, borderColor: lineColor },
                ]} />
              </>
            )}

            {/* Transparent touch capture layer */}
            <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
          </View>

        ) : isLive ? (
          // 1s mode waiting for first ticks
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.green} size="small" />
            <Text style={styles.hintText}>Waiting for live ticks…</Text>
          </View>
        ) : (
          <View style={styles.centered}>
            <Text style={styles.hintText}>No data available</Text>
          </View>
        )}
      </View>

      {displayData.length >= 2 && !loading && (
        <View style={styles.rangeRow}>
          <Text style={styles.rangeVal}>
            ${Math.min(...displayData.map((d) => d.y))
              .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={styles.rangeCenter}>
            {isLive
              ? `${displayData.length} live ticks`
              : `${displayData.length} candles · ${TF_CONFIG[selectedTF].interval}`}
          </Text>
          <Text style={styles.rangeVal}>
            ${Math.max(...displayData.map((d) => d.y))
              .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
      )}

      {/*  Timeframe tabs  */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tfScroll}
        style={styles.tfScrollWrapper}
      >
        {TIMEFRAMES.map((tf) => {
          const active = tf === selectedTF;
          return (
            <TouchableOpacity
              key={tf}
              style={styles.tfBtn}
              onPress={() => setSelectedTF(tf)}
              activeOpacity={0.7}
            >
              {/* 1s gets a special green label even when inactive */}
              <Text style={[
                styles.tfText,
                active && styles.tfTextActive,
                tf === '1s' && !active && styles.tfTextLive,
              ]}>
                {tf}
              </Text>
              {active && (
                <View style={[
                  styles.tfUnderline,
                  { backgroundColor: tf === '1s' ? theme.colors.green : lineColor },
                ]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: theme.spacing.md,
    paddingTop: 8,
    paddingBottom: 4,
    minHeight: 30,
  },

  // LIVE indicator row
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.green,
  },
  liveLabel: {
    color: theme.colors.green,
    fontSize: 11,
    fontWeight: theme.font.bold,
    letterSpacing: 1.2,
  },
  livePct: {
    fontSize: 13,
    fontWeight: theme.font.bold,
  },
  liveSubLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },

  // % change (historical modes)
  tfChangePct: {
    fontSize: 14,
    fontWeight: theme.font.bold,
  },
  tfChangeLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },

  // Touched point display
  touchPrice: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: theme.font.bold,
    letterSpacing: -0.5,
  },
  touchTime: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: theme.font.medium,
    marginLeft: 4,
  },

  // Chart
  chartBox: {
    height: CHART_HEIGHT,
    overflow: 'hidden',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  hintText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  errorText: {
    color: theme.colors.red,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  retryText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: theme.font.semibold,
  },

  // Crosshair
  crosshairLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  crosshairHLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  crosshairDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
  },

  // Range row
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 5,
  },
  rangeVal: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: theme.font.medium,
  },
  rangeCenter: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: theme.font.bold,
    letterSpacing: 0.3,
  },

  // Timeframe tabs
  tfScrollWrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  tfScroll: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  tfBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 46,
  },
  tfText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: theme.font.semibold,
  },
  tfTextActive: {
    color: theme.colors.text,
  },
  tfTextLive: {
    color: theme.colors.green,   // 1s always green even when not selected
  },
  tfUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2,
    borderRadius: 1,
  },

});