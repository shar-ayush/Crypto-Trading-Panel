import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { WS_URL } from '../constants/config';
import { useMarketStore } from '../store/useMarketStore';
import { ServerMessage } from '../types/market';

const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000];

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const addTrade = useMarketStore((s) => s.addTrade);
  const updateTicker = useMarketStore((s) => s.updateTicker);
  const updateKline = useMarketStore((s) => s.updateKline);
  const applySnapshot = useMarketStore((s) => s.applySnapshot);
  const setConnectionStatus = useMarketStore((s) => s.setConnectionStatus);

  const handleMessage = useCallback(
    (event: WebSocketMessageEvent) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        switch (msg.type) {
          case 'trade': addTrade(msg); break;
          case 'ticker': updateTicker(msg); break;
          case 'kline': updateKline(msg); break;
          case 'snapshot': applySnapshot(msg); break;
          case 'status':
            if (msg.status === 'connected') setConnectionStatus('connected');
            if (msg.status === 'reconnecting') setConnectionStatus('reconnecting');
            break;
          case 'pong':
            break;
        }
      } catch (e) {
        console.warn('[WS] Failed to parse message:', e);
      }
    },
    [addTrade, updateTicker, updateKline, applySnapshot, setConnectionStatus]
  );

  const clearRetry = () => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  };

  const connect = useCallback(() => {
    if (!mounted.current) return;

    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionStatus('reconnecting');

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mounted.current) return;
        retryCount.current = 0;
        setConnectionStatus('connected');
        console.log('[WS] ✓ Connected to backend at', WS_URL);
      };

      ws.onmessage = handleMessage;

      ws.onclose = (e) => {
        if (!mounted.current) return;
        console.warn(`[WS] Closed (code=${e.code})`);
        setConnectionStatus('reconnecting');

        const delay = RETRY_DELAYS[Math.min(retryCount.current, RETRY_DELAYS.length - 1)];
        retryCount.current++;
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${retryCount.current})`);
        retryTimer.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        console.warn('[WS] Connection error — will retry on close');
      };
    } catch (e) {
      console.error('[WS] Failed to create WebSocket:', e);
      const delay = RETRY_DELAYS[Math.min(retryCount.current, RETRY_DELAYS.length - 1)];
      retryCount.current++;
      retryTimer.current = setTimeout(connect, delay);
    }
  }, [handleMessage, setConnectionStatus]);

  const handleAppState = useCallback(
    (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const ws = wsRef.current;
        if (
          !ws ||
          ws.readyState === WebSocket.CLOSED ||
          ws.readyState === WebSocket.CLOSING
        ) {
          clearRetry();
          retryCount.current = 0;
          connect();
        }
      }
    },
    [connect]
  );

  useEffect(() => {
    mounted.current = true;
    connect();

    const appStateSub = AppState.addEventListener('change', handleAppState);

    return () => {
      mounted.current = false;
      clearRetry();
      appStateSub.remove();

      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  //  Public API 
  const subscribe = useCallback((symbol: string) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', symbol }));
    }
  }, []);

  return { subscribe };
}