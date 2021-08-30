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
    def __init__(self, max_parallel, transformation):
        self.max_parallel = max_parallel
        self.transformation = transformation

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
            utils.update_status(chunk, 'writing')
            chunk_status.chunk = chunk
            task.set_name(f'process {utils.chunk_id_or_value(chunk)}')
            log(f"WRITE {fmt(chunk)} r-w balance: {self.read_write_balance}")
            log(f"  -   {fmt(chunk)} scheduled: {task}")
            log(f"  -   {fmt(chunk)} return: {fmt(drain)}")

        return drain


    def read(self):
        log(f'READ r-w balance: {self.read_write_balance}')

        if self.read_write_balance == self.max_parallel:
            waiting = self.waiting_for_read.get_nowait()
            waiting.set_result(True)

        if self.ended and self.read_write_balance <= 0:
            log('  -  processing ended, return None')
            return self.no_more_items

        self.read_write_balance -= 1
        awaitable = self.ready.get()
        log(f'  -  got: {awaitable}')
        return awaitable


    def end(self):
        log(f'END read-write balance: {self.read_write_balance}')
        if self.read_write_balance < 0:
            # schedule as a task to make sure it will run after any pending
            # _process updates last_chunk_status
            asyncio.create_task(self._resolve_overflow_readers())
        self.ended = True


    async def _resolve_overflow_readers(self):
        async def append_none():
            log(f'END waiting for last item: {self.last_chunk_status}')
            await self.last_chunk_status
            await self.ready.put(None)
            log(f'END appended None')

        for _ in range(-self.read_write_balance):
            nuller = asyncio.create_task(append_none())
            log(f'END add item for overflow reader: {nuller}')


    async def _process(self, chunk, chunk_status):
        transform = self.transformation(chunk)
        previous = self.last_chunk_status

        if DEBUG:
            utils.update_status(chunk, 'processing')
            log(f'PROCESS {fmt(chunk)} transformation: {transform}')
            log(f'   -    {fmt(chunk)} previous item: {fmt(previous)}')
            log(f'   -    {fmt(chunk)} status: {fmt(chunk_status)}')

        self.last_chunk_status = chunk_status
        result = (await asyncio.gather(transform, previous))[0]
        chunk_status.set_result(True)

        if DEBUG:
            utils.update_status(chunk, 'ready')
            log(f'PROCESS {fmt(chunk)} status: {fmt(chunk_status)}')
            log(f'   -    {fmt(chunk)} {green}result:{reset} {result}')

        await self.ready.put(result)
