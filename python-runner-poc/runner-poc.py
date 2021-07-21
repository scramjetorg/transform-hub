#!/bin/env python3
# tested with python 3.8.10

import sys
import asyncio
import aiofiles
from aiostream import stream, pipe
import json
from datetime import datetime
import importlib

try:
    INPUT = sys.argv[1]
    OUTPUT = sys.argv[2]
    CONTROL = sys.argv[3]
    MODULE = sys.argv[4]
except IndexError:
    print("Missing argument!")
    print(f"Usage: {sys.argv[0]} input-fifo output-fifo ctrl-fifo user_module")
    sys.exit(1)

def with_time(text):
    print(f'{datetime.now().strftime("%H:%M:%S")} - {text}')

async def handle_control_stream(stream, context):
    async for line in stream:
        try:
            context['add'] = int(line)
            with_time(f'Got ctrl message: {context}')
        except ValueError:
            print('Invalid control message - not a number:', line)

async def main():
    async with aiofiles.open(INPUT, 'r') as f_in, \
               aiofiles.open(OUTPUT, 'w') as f_out, \
               aiofiles.open(CONTROL, 'r') as f_ctrl:
        context = {}
        asyncio.create_task(handle_control_stream(f_ctrl, context))
        user_module = importlib.import_module(MODULE)

        async def process(chunk):
            return await transform(chunk, context)

        result = await user_module.transform(stream.iterate(f_in), context)
        async with result.stream() as streamer:
            async for chunk in streamer:
                await f_out.write(str(chunk))
                await f_out.flush()

        # asyncio.create_task(handle_control_stream(f_ctrl, context))
        # await user_module.transform(context, f_in, f_out)

asyncio.run(main())
