import queue
import time
from typing import Any, Dict, Optional


class EventManager:
    def __init__(self, heartbeat_interval: int = 15):
        self.listeners: list[queue.Queue] = []
        self.heartbeat_interval = heartbeat_interval

    def listen(self) -> queue.Queue:
        q: queue.Queue = queue.Queue(maxsize=10)
        self.listeners.append(q)
        return q

    def broadcast(self, data: Dict[str, Any]) -> None:
        for i in reversed(range(len(self.listeners))):
            try:
                self.listeners[i].put_nowait(data)
            except queue.Full:
                del self.listeners[i]

    def cleanup(self) -> None:
        """Clean up disconnected listeners."""
        self.listeners = [q for q in self.listeners if not q.empty()]


event_manager = EventManager()


def event_stream_generator(manager: EventManager, timeout: Optional[float] = None):
    """Generate SSE events with heartbeat support."""
    q = manager.listen()
    last_heartbeat = time.time()

    try:
        while True:
            try:
                data = q.get(timeout=5.0)
                yield f"data: {__import__('json').dumps(data)}\n\n"
            except queue.Empty:
                current_time = time.time()
                if current_time - last_heartbeat >= manager.heartbeat_interval:
                    yield ": heartbeat\n\n"
                    last_heartbeat = current_time
    finally:
        try:
            manager.listeners.remove(q)
        except ValueError:
            pass
