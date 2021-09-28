#!/bin/env python3

import asyncio
from os import environ
from ansi_color_codes import *
import utils

DEBUG = 'PYFCA_DEBUG' in environ
fmt = utils.print_formatted

def log(*args):
    if DEBUG:
        utils.LogWithTimer.log(f"{grey}pyfca{reset}", *args)


class Pyfca:
    def __init__(self, max_parallel, initial_transform=None):
        self.max_parallel = max_parallel
        self.transform_chain = []
        if initial_transform:
            self.transform_chain.append(initial_transform)

        self.processing = asyncio.Queue()
        self.ready = asyncio.Queue()
        self.waiting_for_read = asyncio.Queue()
        self.ended = False
        # increment on write, decrement on read
        self.read_write_balance = 0

        # sentinels for start/end conditions
        self.last_chunk_status = asyncio.Future()
        self.last_chunk_status.set_result(True)
        self.last_chunk_status.chunk = {'id': 'start-sentinel'}
        for _ in range(max_parallel - 1):
            self.processing.put_nowait(self.last_chunk_status)

        self.no_more_items = asyncio.Future()
        self.no_more_items.set_result(None)

        log('INIT finished')


    def write(self, chunk):
        self.read_write_balance += 1

        chunk_status = asyncio.Future()
        self.processing.put_nowait(chunk_status)
        task = asyncio.create_task(self._process(chunk, chunk_status))
        if self.read_write_balance < self.max_parallel:
            # if we always returned gather, we would loose sync
            drain = self.processing.get_nowait()
        else:
            waiting = asyncio.Future()
            self.waiting_for_read.put_nowait(waiting)
            drain = asyncio.gather(self.processing.get_nowait(), waiting)

        if DEBUG:
            chunk_status.chunk = chunk
            task.set_name(f'process {utils.chunk_id_or_value(chunk)}')
            log(f"WRITE {fmt(chunk)} r/w balance: {self.read_write_balance}")
            log(f"  -   {fmt(chunk)} scheduled: {task}")
            log(f"  -   {fmt(chunk)} return: {fmt(drain)}")

        return drain


    def read(self):
        if self.ended and self.read_write_balance <= 0:
            log('READ processing ended, return None')
            return self.no_more_items

        self.read_write_balance -= 1
        log(f'READ r/w balance: {self.read_write_balance}')

        if self.read_write_balance == self.max_parallel - 1:
            waiting = self.waiting_for_read.get_nowait()
            waiting.set_result(True)

        awaitable = self.ready.get()
        log(f'  -  got: {awaitable}')
        return awaitable


    def end(self):
        log(f'{red}END{reset} stop accepting input.')
        log(f' -  r/w balance: {self.read_write_balance}')
        self.ended = True
        # schedule as a task to make sure it will run after any pending
        # _process updates last_chunk_status
        asyncio.create_task(self._resolve_overflow_readers())


    def add_transform(self, transformation):
        self.transform_chain.append(transformation)
        log(f'ADD_TRANSFORM current chain: {self.transform_chain}')


    async def _resolve_overflow_readers(self):
        log(f'END waiting for last item: {self.last_chunk_status}')
        await self.last_chunk_status

        log(f'END final r/w balance: {self.read_write_balance}')
        for _ in range(-self.read_write_balance):
            self.ready.put_nowait(None)
            log(f' -  appended None')


    async def _process(self, chunk, chunk_status):
        previous = self.last_chunk_status

        if DEBUG:
            log(f'PROCESS {fmt(chunk)} previous item: {fmt(previous)}')
            log(f'   -    {fmt(chunk)} status: {fmt(chunk_status)}')

        self.last_chunk_status = chunk_status
        result = chunk
        for func in self.transform_chain:
            result = func(result)
            log(f'   -    {fmt(chunk)} function: {func}')
            log(f'   -    {fmt(chunk)} yielded: {repr(result)}')
            if asyncio.iscoroutine(result):
                result = await result
                log(f'PROCESS {fmt(chunk)} resolved: {repr(result)}')
            if result is None:
                break

        log(f'   -    {fmt(chunk)} processing {pink}finished{reset}')
        log(f'   -    {fmt(chunk)} awaiting for previous chunk: {fmt(previous)}')
        await previous
        chunk_status.set_result(True)
        log(f'PROCESS {fmt(chunk)} status: {fmt(chunk_status)}')

        if result is not None:
            log(f'   -    {fmt(chunk)} {green}return{reset}: {repr(result)}')
            await self.ready.put(result)
        else:
            log(f'   -    {fmt(chunk)} {cyan}remove{reset}')
            self.read_write_balance -= 1


