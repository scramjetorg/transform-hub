#!/bin/env python3

import asyncio
from os import environ
from scramjet.ansi_color_codes import *
import scramjet.utils as utils

DEBUG = 'PYFCA_DEBUG' in environ or 'SCRAMJET_DEBUG' in environ
fmt = utils.print_formatted

def log(pyfca, *args):
    if DEBUG:  # pragma: no cover
        utils.LogWithTimer.log(f"{grey}{pyfca.name}{reset}", *args)


# Use this class to tell pyfca to drop a chunk.
class DropChunk:
    pass


class WriteAfterEnd(Exception):
    pass


class MultipleEnd(Exception):
    pass


class Pyfca:
    def __init__(self, max_parallel, name="pyfca"):
        self.max_parallel = max_parallel
        self.name = name
        self._transform_chain = []

        self._processing = asyncio.Queue()
        self._ready = asyncio.Queue()
        self._waiting_for_read = asyncio.Queue()
        self.ended = False
        # increment on write, decrement on read
        self.read_write_balance = 0

        # sentinels for start/end conditions
        self.last_chunk_status = asyncio.Future()
        self.last_chunk_status.set_result(True)
        self.last_chunk_status.chunk = {'id': 'start-sentinel'}
        for _ in range(max_parallel - 1):
            self._processing.put_nowait(self.last_chunk_status)

        self._no_more_items = asyncio.Future()
        self._no_more_items.set_result(None)

        log(self, 'INIT finished')


    def write(self, chunk):
        if self.ended:
            raise WriteAfterEnd
        self.read_write_balance += 1

        chunk_status = asyncio.Future()
        self._processing.put_nowait(chunk_status)
        task = asyncio.create_task(self._process(chunk, chunk_status))
        if self.read_write_balance < self.max_parallel:
            # if we always returned gather, we would loose sync
            drain = self._processing.get_nowait()
        else:
            waiting = asyncio.Future()
            self._waiting_for_read.put_nowait(waiting)
            drain = asyncio.gather(self._processing.get_nowait(), waiting)

        if DEBUG:  # pragma: no cover
            chunk_status.chunk = chunk
            task.set_name(f'process {utils.pprint_chunk(chunk)}')
            log(self, f"WRITE {fmt(chunk)} r/w balance: {self.read_write_balance}")
            log(self, f"  -   {fmt(chunk)} scheduled: {task}")
            log(self, f"  -   {fmt(chunk)} return: {fmt(drain)}")

        return drain


    def read(self):
        if self.ended and self.read_write_balance <= 0:
            log(self, 'READ processing ended, return None')
            return self._no_more_items

        self.read_write_balance -= 1
        log(self, f'READ r/w balance: {self.read_write_balance}')

        try:
            waiting = self._waiting_for_read.get_nowait()
            waiting.set_result(True)
        except asyncio.queues.QueueEmpty:
            pass

        awaitable = self._ready.get()
        log(self, f'  -  return: {awaitable}')
        return awaitable


    def end(self):
        if self.ended:
            raise MultipleEnd
        log(self, f'{red}END{reset} stop accepting input.')
        log(self, f' -  r/w balance: {self.read_write_balance}')
        self.ended = True
        # schedule as a task to make sure it will run after any pending
        # _process updates last_chunk_status
        asyncio.create_task(self._resolve_overflow_readers())


    def add_transform(self, transformation):
        self._transform_chain.append(transformation)
        log(self, f'ADD_TRANSFORM current chain: {self._transform_chain}')


    async def _resolve_overflow_readers(self):
        log(self, f'END waiting for last item: {self.last_chunk_status}')
        await self.last_chunk_status

        log(self, f'END final r/w balance: {self.read_write_balance}')
        for _ in range(-self.read_write_balance):
            self._ready.put_nowait(None)
            log(self, f' -  appended None')


    async def _process(self, chunk, chunk_status):
        previous = self.last_chunk_status

        if DEBUG:  # pragma: no cover
            log(self, f'PROCESS {fmt(chunk)} previous item: {fmt(previous)}')
            log(self, f'   -    {fmt(chunk)} status: {fmt(chunk_status)}')

        self.last_chunk_status = chunk_status
        result = chunk
        for func in self._transform_chain:
            result = func(result)
            log(self, f'   -    {fmt(chunk)} function: {func}')
            log(self, f'   -    {fmt(chunk)} yielded: {repr(result)}')
            if asyncio.iscoroutine(result):
                result = await result
                log(self, f'PROCESS {fmt(chunk)} resolved: {repr(result)}')
            if result is DropChunk:
                break

        log(self, f'   -    {fmt(chunk)} processing {pink}finished{reset}')
        log(self, f'   -    {fmt(chunk)} awaiting for previous chunk: {fmt(previous)}')
        await previous
        chunk_status.set_result(True)
        log(self, f'PROCESS {fmt(chunk)} status: {fmt(chunk_status)}')

        if result is not DropChunk:
            log(self, f'   -    {fmt(chunk)} {green}return{reset}: '
                     f' {utils.print_trimmed(result, color=False)}')
            await self._ready.put(result)
        else:
            log(self, f'   -    {fmt(chunk)} {cyan}drop chunk{reset}')
            self.read_write_balance -= 1
            if self.read_write_balance == self.max_parallel - 1:
                waiting = self._waiting_for_read.get_nowait()
                waiting.set_result(True)

