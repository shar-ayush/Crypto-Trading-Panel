import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useMarketStore } from '../store/useMarketStore';
import { theme } from '../constants/theme';

export function ConnectionBanner() {
  const status = useMarketStore((s) => s.connectionStatus);
  const opacity = useRef(new Animated.Value(1)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    anim.current?.stop();

    if (status === 'reconnecting') {
      anim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        ])
      );
      anim.current.start();
    } else {
      opacity.setValue(1);
    }

    return () => anim.current?.stop();
  }, [status]);

  if (status === 'connected') return null;

  return (
    <Animated.View style={[styles.banner, { opacity }]}>
      <View style={styles.dot} />
      <Text style={styles.text}>
        {status === 'reconnecting' ? 'Reconnecting to server…' : 'Connection lost'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1200',
    paddingVertical: 7,
    gap: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.gold,
  },
  text: {
    color: theme.colors.gold,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});