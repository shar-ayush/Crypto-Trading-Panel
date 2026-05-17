import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { useMarketStore } from '../store/useMarketStore';
import { theme } from '../constants/theme';
import { SYMBOLS, SYMBOL_LABELS, SymbolType } from '../constants/config';

type Props = {
  onSymbolChange?: (symbol: string) => void;
};

export function Header({ onSymbolChange }: Props) {
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const setActiveSymbol = useMarketStore((s) => s.setActiveSymbol);
  const status = useMarketStore((s) => s.connectionStatus);

  const handlePress = useCallback(
    (sym: string) => {
      setActiveSymbol(sym);
      onSymbolChange?.(sym);
    },
    [setActiveSymbol, onSymbolChange]
  );

  const dotColor =
    status === 'connected' ? theme.colors.green :
      status === 'reconnecting' ? theme.colors.gold : theme.colors.red;

  const dotLabel =
    status === 'connected' ? 'LIVE' :
      status === 'reconnecting' ? 'SYNC' : 'OFF';

  return (
    <View style={styles.container}>
      {/* Top row: title + status */}
      <View style={styles.topRow}>
        <Text style={styles.title}>Crypto Trading Panel</Text>
        <View style={styles.liveRow}>
          <View style={[styles.liveDot, { backgroundColor: dotColor }]} />
          <Text style={[styles.liveText, { color: dotColor }]}>{dotLabel}</Text>
        </View>
      </View>

      {/* Symbol tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
      >
        {SYMBOLS.map((sym) => {
          const active = sym === activeSymbol;
          return (
            <TouchableOpacity
              key={sym}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => handlePress(sym)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {SYMBOL_LABELS[sym as SymbolType]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    paddingTop: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: 10,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: theme.font.bold,
    letterSpacing: -0.5,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  liveText: {
    fontSize: 10,
    fontWeight: theme.font.bold,
    letterSpacing: 1.2,
  },
  tabsContent: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    marginRight: 2,
  },
  tabActive: {
    backgroundColor: theme.colors.surfaceHigh,
  },
  tabText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: theme.font.semibold,
  },
  tabTextActive: {
    color: theme.colors.text,
  },
});