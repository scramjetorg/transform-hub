from pyfca import Pyfca
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

    async def to_list(self):
        self._uncork()
        result = []
        chunk = await self.pyfca.read()
        while chunk is not None:
            result.append(chunk)
            chunk = await self.pyfca.read()
        return result
