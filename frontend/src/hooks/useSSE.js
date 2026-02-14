import { useEffect, useRef, useState } from 'react';

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_DELAY = 30000;

export const useSSE = (verifiedProfile, onMessage) => {
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = () => {
    if (!verifiedProfile) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource('/api/stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connected');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.profile === verifiedProfile) {
          onMessage(data);
        }
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      setIsConnected(false);
      eventSource.close();

      const delay = Math.min(
        RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
        MAX_RECONNECT_DELAY
      );
      reconnectAttemptsRef.current++;

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  };

  useEffect(() => {
    if (verifiedProfile) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setIsConnected(false);
    };
  }, [verifiedProfile]);

  return { isConnected };
};
