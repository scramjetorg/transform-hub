from pyfca import Pyfca, omit_chunk
import asyncio

class DataStream():
    def __init__(self, max_parallel=64, upstream=None):
        self.upstream = upstream
        self.pyfca = upstream.pyfca if upstream else Pyfca(max_parallel)
        self.ready_to_start = asyncio.Future()

    def _uncork(self):
        self.ready_to_start.set_result(True)
        if self.upstream:
            self.upstream._uncork()

    def from_iterable(self, iterable):
        async def consume():
            await self.ready_to_start
            for item in iterable:
                await self.pyfca.write(item)
            self.pyfca.end()

        # run in background, as it will involve waiting for
        # processing elements
        asyncio.create_task(consume())
        return self

    def filter(self, func):
        async def run_filter(chunk):
            decision = func(chunk)
            if asyncio.iscoroutine(decision):
                decision = await decision
            return chunk if decision else omit_chunk
        new_stream = DataStream(upstream=self)
        new_stream.pyfca.add_transform(run_filter)
        return new_stream

    def map(self, func):
        new_stream = DataStream(upstream=self)
        new_stream.pyfca.add_transform(func)
        return new_stream

    async def to_list(self):
        self._uncork()
        result = []
        chunk = await self.pyfca.read()
        while chunk is not None:
            result.append(chunk)
            chunk = await self.pyfca.read()
        return result
