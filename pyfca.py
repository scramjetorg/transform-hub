#!/bin/env python3

import asyncio

class Pyfca:
    def __init__(self, transformation):
        self.transformation = transformation
        self.ready = asyncio.Queue()
        self.previous_item_done = asyncio.Future()
        self.previous_item_done.set_result(True)

    def write(self, chunk):
        print(f"WRITE chunk: {chunk}")
        processing = asyncio.create_task(self._process(chunk))
        print(f"  -   processing: {processing}")

    def read(self):
        awaitable_result = self.ready.get()
        print(f"READ got: {awaitable_result}")
        return awaitable_result

    async def _process(self, chunk):
        transformation = self.transformation(chunk)
        previous = self.previous_item_done
        item_done = asyncio.Future()
        self.previous_item_done = item_done

        print(f'PROCESS ({chunk}) transformation:', transformation)
        print(f'   -    ({chunk}) previous item:', previous)
        print(f'   -    ({chunk}) item_done:', item_done)

        result = (await asyncio.gather(transformation, previous))[0]
        item_done.set_result(True)

        print(f'PROCESS ({chunk}) item_done:', item_done)
        print(f'   -    ({chunk}) result:', result)

        await self.ready.put(result)
