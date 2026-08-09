import asyncio
from collections import defaultdict


class AsyncIOEventEmitter:
    def __init__(self, loop=None):
        self._loop = loop
        self._listeners = defaultdict(list)

    def on(self, event_name, callback=None):
        if callback is None:
            def decorator(fn):
                self._listeners[event_name].append(fn)
                return fn

            return decorator

        self._listeners[event_name].append(callback)
        return callback

    def emit(self, event_name, *args, **kwargs):
        for callback in list(self._listeners.get(event_name, [])):
            result = callback(*args, **kwargs)
            if asyncio.iscoroutine(result):
                loop = self._loop or asyncio.get_running_loop()
                loop.create_task(result)
