import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useMarketStore, selectCurrentPrice, selectTicker } from '../store/useMarketStore';
import { theme } from '../constants/theme';
import { SYMBOL_LABELS, SymbolType } from '../constants/config';

type OrderSide = 'buy' | 'sell';
type OrderType = 'market' | 'limit';

const QUICK_AMOUNTS = ['$10', '$50', '$100', '$500'];

export function TradePanel() {
  const [side, setSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [showModal, setShowModal] = useState(false);

  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const currentPrice = useMarketStore(selectCurrentPrice);
  const ticker = useMarketStore(selectTicker);

  const baseLabel = SYMBOL_LABELS[activeSymbol as SymbolType] ?? activeSymbol.replace('USDT', '');
  const usdAmount = parseFloat(amount) || 0;
  const execPrice = orderType === 'limit'
    ? (parseFloat(limitPrice) || currentPrice)
    : currentPrice;
  const coinAmount = execPrice > 0 ? usdAmount / execPrice : 0;

  const accentColor = side === 'buy' ? theme.colors.buy : theme.colors.sell;
  const accentBg = side === 'buy' ? theme.colors.greenBg : theme.colors.redBg;

  const handleReview = useCallback(() => {
    if (usdAmount <= 0) {
      Alert.alert('Amount Required', 'Please enter a valid USD amount to continue.');
      return;
    }
    if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      Alert.alert('Limit Price Required', 'Please enter a limit price for your order.');
      return;
    }
    setShowModal(true);
  }, [usdAmount, orderType, limitPrice]);

  const handleConfirm = useCallback(() => {
    setShowModal(false);
    setAmount('');
    setLimitPrice('');
    Alert.alert(
      '✓ Order Placed',
      `${side.toUpperCase()} ${coinAmount.toFixed(6)} ${baseLabel} ` +
      `for $${usdAmount.toFixed(2)} (demo — no real trade executed).`,
      [{ text: 'Done', style: 'default' }]
    );
  }, [side, coinAmount, baseLabel, usdAmount]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.container}>

        {/*  Buy / Sell toggle  */}
        <View style={styles.sideToggle}>
          {(['buy', 'sell'] as OrderSide[]).map((s) => {
            const active = s === side;
            const bg = active
              ? (s === 'buy' ? theme.colors.buy : theme.colors.sell)
              : 'transparent';
            return (
              <TouchableOpacity
                key={s}
                style={[styles.sideBtn, { backgroundColor: bg }]}
                onPress={() => setSide(s)}
                activeOpacity={0.8}
              >
                <Text style={[styles.sideBtnText, !active && { color: theme.colors.textSecondary }]}>
                  {s.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.orderTypeRow}>
          {(['market', 'limit'] as OrderType[]).map((t) => {
            const active = t === orderType;
            return (
              <TouchableOpacity
                key={t}
                style={[
                  styles.orderTypeBtn,
                  { borderColor: active ? accentColor : theme.colors.border },
                ]}
                onPress={() => setOrderType(t)}
              >
                <Text style={[
                  styles.orderTypeText,
                  { color: active ? accentColor : theme.colors.textSecondary },
                ]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {orderType === 'limit' && (
          <View style={[styles.inputBox, { borderColor: limitPrice ? accentColor : theme.colors.border }]}>
            <Text style={styles.inputPrefix}>Limit $</Text>
            <TextInput
              style={styles.input}
              value={limitPrice}
              onChangeText={setLimitPrice}
              keyboardType="decimal-pad"
              placeholder={currentPrice > 0 ? currentPrice.toFixed(2) : '0.00'}
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        )}

        <View style={[styles.inputBox, { borderColor: amount ? accentColor : theme.colors.border }]}>
          <Text style={styles.inputPrefix}>USD</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <View style={styles.equivRow}>
          <Text style={styles.equivText}>
            ≈ {coinAmount > 0 ? coinAmount.toFixed(6) : '0.000000'} {baseLabel}
          </Text>
          {ticker && (
            <Text style={styles.spreadText}>
              Spread  ${Math.abs(ticker.askPrice - ticker.bidPrice).toFixed(2)}
            </Text>
          )}
        </View>

        <View style={styles.quickRow}>
          {QUICK_AMOUNTS.map((q) => (
            <TouchableOpacity
              key={q}
              style={styles.quickBtn}
              onPress={() => setAmount(q.replace('$', ''))}
            >
              <Text style={styles.quickBtnText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.reviewBtn, { backgroundColor: accentColor, opacity: usdAmount > 0 ? 1 : 0.45 }]}
          onPress={handleReview}
          activeOpacity={0.85}
        >
          <Text style={styles.reviewBtnText}>
            Review {side === 'buy' ? 'Buy' : 'Sell'} Order
          </Text>
        </TouchableOpacity>

        {ticker && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Bid  <Text style={styles.footerVal}>${ticker.bidPrice.toFixed(2)}</Text>
            </Text>
            <Text style={styles.footerText}>
              Ask  <Text style={styles.footerVal}>${ticker.askPrice.toFixed(2)}</Text>
            </Text>
            <Text style={styles.footerText}>
              Trades  <Text style={styles.footerVal}>
                {ticker.totalTrades.toLocaleString()}
              </Text>
            </Text>
          </View>
        )}
      </View>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.sheet} onPress={() => { }}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>Review Order</Text>

            <View style={styles.summaryBox}>
              {[
                ['Action', `${side === 'buy' ? '🟢 Buy' : '🔴 Sell'} ${baseLabel}`],
                ['Amount', `$${usdAmount.toFixed(2)}`],
                ['Quantity', `${coinAmount.toFixed(6)} ${baseLabel}`],
                ['Type', orderType === 'market' ? 'Market Order' : 'Limit Order'],
                ['Price', orderType === 'market'
                  ? `$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                  : `$${parseFloat(limitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
                ['Est. Fee', '$0.00'],
              ].map(([lbl, val]) => (
                <View key={lbl} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{lbl}</Text>
                  <Text style={styles.summaryValue}>{val}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.disclaimer}>
              Demo mode — no real trade executed.
            </Text>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: accentColor }]}
              onPress={handleConfirm}
              activeOpacity={0.88}
            >
              <Text style={styles.confirmBtnText}>
                Confirm {side === 'buy' ? 'Buy' : 'Sell'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: 10,
    paddingBottom: theme.spacing.xl,
  },
  sideToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radius.md,
    padding: 3,
    gap: 3,
  },
  sideBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  sideBtnText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: theme.font.bold,
    letterSpacing: 0.5,
  },
  orderTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  orderTypeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  orderTypeText: {
    fontSize: 13,
    fontWeight: theme.font.semibold,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    gap: 8,
  },
  inputPrefix: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: theme.font.semibold,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: theme.font.semibold,
    paddingVertical: 11,
  },
  equivRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  equivText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: theme.font.medium,
  },
  spreadText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHigh,
  },
  quickBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: theme.font.semibold,
  },
  reviewBtn: {
    paddingVertical: 16,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: 4,
  },
  reviewBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: theme.font.bold,
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  footerText: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  footerVal: {
    color: theme.colors.textSecondary,
    fontWeight: theme.font.semibold,
  },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    paddingBottom: 44,
    gap: 14,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 6,
  },
  sheetTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: theme.font.bold,
    textAlign: 'center',
  },
  summaryBox: {
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: theme.font.semibold,
  },
  disclaimer: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  confirmBtn: {
    paddingVertical: 16,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: theme.font.bold,
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: theme.font.semibold,
  },
});