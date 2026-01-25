import { useEffect } from 'react';

export const useSSE = (verifiedProfile, onMessage) => {
  useEffect(() => {
    if (!verifiedProfile) return;

    const eventSource = new EventSource('/api/stream');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.profile === verifiedProfile) {
        onMessage(data);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [verifiedProfile, onMessage]);
};
