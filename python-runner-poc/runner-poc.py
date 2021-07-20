#!/bin/env python3
# tested with python 3.8.10

import sys
import asyncio
import json
from datetime import datetime
import aiofiles
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

print(f'Reading from {INPUT} and writing to {OUTPUT}.\n')

def with_time(text):
    print(f'{datetime.now().strftime("%H:%M:%S")} - {text}')

user_module = importlib.import_module(MODULE)

async def process(chunk, output, context):
    data = json.loads(chunk)
    with_time(f'Processing #{data["counter"]}')
    result = await user_module.transform(data, context)
    await output.write(json.dumps(result) + '\n')
    await output.flush()
    with_time(f'Finished #{data["counter"]}')

async def handle_control_stream(stream, context):
    async for line in stream:
        with_time(f'Got control message: {line}')
        context['args'] = json.loads(line)

async def main():
    async with aiofiles.open(INPUT, 'r') as f_in, \
               aiofiles.open(OUTPUT, 'w') as f_out, \
               aiofiles.open(CONTROL, 'r') as f_ctrl:
        context = {}
        asyncio.create_task(handle_control_stream(f_ctrl, context))
        async for line in f_in:
            asyncio.create_task(process(line, f_out, context))

asyncio.run(main())
