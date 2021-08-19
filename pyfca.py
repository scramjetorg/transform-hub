#!/bin/env python3

import asyncio
from pprint import pprint as pp

class Pyfca:
    def __init__(self, transformation):
        self.transformation = transformation
        self.ready = asyncio.Queue()
        self.previous_item_done = asyncio.Future()
        self.previous_item_done.set_result(True)
        self.ended = False
        # increment on write, decrement on read
        self.read_write_balance = 0

    def write(self, chunk):
        print(f"WRITE {self.read_write_balance} chunk: {chunk}")
        self.read_write_balance += 1
        processing = asyncio.create_task(self._process(chunk))
        print(f"  -   processing: {processing}")

    def read(self):
        if self.ended and self.read_write_balance <= 0:
            no_more_items = asyncio.Future()
            no_more_items.set_result(None)
            return no_more_items
        self.read_write_balance -= 1
        awaitable_result = self.ready.get()
        print(f"READ {self.read_write_balance} got: {awaitable_result}")
        return awaitable_result

    async def _resolve_overflow_readers(self):
        last_item_done = self.previous_item_done

        async def append_none():
            print(f'END last item: {last_item_done}')
            await last_item_done
            await self.ready.put(None)

        for _ in range(-self.read_write_balance):
            nuller = asyncio.create_task(append_none())
            print(f'END null appender: {nuller}')

    def end(self):
        print(f'END read-write balance: {self.read_write_balance}')
        if self.read_write_balance < 0:
            # schedule as a task to make sure it will run after any pending
            # _process updates previous_item_done
            asyncio.create_task(self._resolve_overflow_readers())
        self.ended = True

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
