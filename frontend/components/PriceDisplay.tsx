import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import {
  useMarketStore,
  selectCurrentPrice,
  selectTicker,
  selectLastSide,
} from '../store/useMarketStore';
import { theme } from '../constants/theme';
import { SYMBOL_NAMES, SymbolType } from '../constants/config';

function formatPrice(price: number): string {
  if (price === 0) return '—';
  const decimals = price >= 100 ? 2 : price >= 1 ? 4 : 6;
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `$${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(2)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(2)}K`;
  return `$${vol.toFixed(2)}`;
}

export function PriceDisplay() {
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const currentPrice = useMarketStore(selectCurrentPrice);
  const ticker = useMarketStore(selectTicker);
  const lastSide = useMarketStore(selectLastSide);

  const flashAnim = useRef(new Animated.Value(0)).current;
  const prevPrice = useRef(0);

  useEffect(() => {
    if (currentPrice !== prevPrice.current && prevPrice.current !== 0) {
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 0, duration: 350, useNativeDriver: false }),
      ]).start();
    }
    prevPrice.current = currentPrice;
  }, [currentPrice]);

  const isPositive = (ticker?.priceChangePct ?? 0) >= 0;
  const changeColor = isPositive ? theme.colors.green : theme.colors.red;
  const changeBg = isPositive ? theme.colors.greenBg : theme.colors.redBg;

  const flashBg = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      'rgba(0,0,0,0)',
      lastSide === 'buy'
        ? 'rgba(0,200,5,0.08)'
        : 'rgba(255,59,48,0.08)',
    ],
  });

  const priceDelta = ticker
    ? (ticker.priceChange >= 0 ? '+' : '') + '$' + Math.abs(ticker.priceChange).toFixed(2)
    : null;

  return (
    <Animated.View style={[styles.container, { backgroundColor: flashBg }]}>

      {/* Coin name */}
      <Text style={styles.coinName}>
        {SYMBOL_NAMES[activeSymbol as SymbolType] ?? activeSymbol}
      </Text>

      {/* Large price */}
      <Text style={styles.price} numberOfLines={1} adjustsFontSizeToFit>
        ${formatPrice(currentPrice)}
      </Text>

      {/* 24h change row */}
      {ticker ? (
        <View style={styles.changeRow}>
          <View style={[styles.changeBadge, { backgroundColor: changeBg }]}>
            <Text style={[styles.changePct, { color: changeColor }]}>
              {isPositive ? '▲' : '▼'} {Math.abs(ticker.priceChangePct).toFixed(2)}%
            </Text>
          </View>
          <Text style={styles.changeAbs}>{priceDelta} today</Text>
        </View>
      ) : (
        <Text style={styles.loading}>Loading market data…</Text>
      )}

      {/* Stats row: high / low / volume */}
      {ticker && (
        <View style={styles.statsCard}>
          <StatItem label="24H HIGH" value={`$${formatPrice(ticker.highPrice)}`} />
          <View style={styles.divider} />
          <StatItem label="24H LOW" value={`$${formatPrice(ticker.lowPrice)}`} />
          <View style={styles.divider} />
          <StatItem label="VOLUME" value={formatVolume(ticker.quoteVolume)} />
        </View>
      )}
    </Animated.View>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  coinName: {
    color: theme.colors.textSecondary,
    fontSize: theme.font.sm,
    fontWeight: theme.font.medium,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  price: {
    color: theme.colors.text,
    fontSize: theme.font.xxxl,
    fontWeight: theme.font.heavy,
    letterSpacing: -1.5,
    marginBottom: 8,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  changeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  changePct: {
    fontSize: theme.font.sm,
    fontWeight: theme.font.bold,
  },
  changeAbs: {
    color: theme.colors.textSecondary,
    fontSize: theme.font.sm,
    fontWeight: theme.font.medium,
  },
  loading: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sm,
    marginBottom: theme.spacing.md,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statLabel: {
    color: theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: theme.font.bold,
    letterSpacing: 0.8,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: theme.font.sm,
    fontWeight: theme.font.semibold,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginHorizontal: 4,
  },
});