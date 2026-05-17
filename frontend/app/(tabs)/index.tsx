import React, { useCallback } from 'react';
import { StyleSheet, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useWebSocket } from '../../hooks/useWebSocket';
import { ConnectionBanner } from '../../components/ConnectionBanner';
import { Header } from '../../components/Header';
import { PriceDisplay } from '../../components/PriceDisplay';
import { PriceChart } from '../../components/PriceChart';
import { TradePanel } from '../../components/TradePanel';
import { theme } from '../../constants/theme';

export default function TradingScreen() {
  const { subscribe } = useWebSocket();

  const handleSymbolChange = useCallback(
    (symbol: string) => subscribe(symbol),
    [subscribe]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      <ConnectionBanner />

      <Header onSymbolChange={handleSymbolChange} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <PriceDisplay />
        <PriceChart />
        <TradePanel />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});