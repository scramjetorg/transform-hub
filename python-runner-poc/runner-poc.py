#!/bin/env python3
# tested with python 3.8.10

import sys
import asyncio
import aiofiles
from aiostream import stream, pipe
import json
import importlib
import logging

try:
    INPUT = sys.argv[1]
    OUTPUT = sys.argv[2]
    CONTROL = sys.argv[3]
    LOGGING = sys.argv[4]
    MODULE = sys.argv[5]
except IndexError:
    print("Missing argument!")
    print(f"Usage: {sys.argv[0]} input-fifo output-fifo ctrl-fifo user_module")
    sys.exit(1)


class AppContext:
    def __init__(self, log_stream):
        formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
        log_handler = logging.StreamHandler(log_stream)
        log_handler.setFormatter(formatter)
        log_handler.setLevel(logging.DEBUG)

        self.logger = logging.getLogger('scramjet-python-runner')
        self.logger.setLevel(logging.DEBUG)
        self.logger.addHandler(log_handler)


async def handle_control_stream(context, stream):
    async for line in stream:
        try:
            data = json.loads(line)
            context.logger.warning(f'Got ctrl message: {data}')
            if 'add' in data:
                context.increment_result = data['add']
        except json.JSONDecodeError:
            context.logger.error(f'Invalid control message - not a valid JSON: {line}')


async def main():
    async with aiofiles.open(INPUT, 'r') as f_in, \
               aiofiles.open(OUTPUT, 'w') as f_out, \
               aiofiles.open(CONTROL, 'r') as f_ctrl:

        # logging module doesn't work with aiofiles. However, writing to a
        # named pipe should hopefully not incur a long wait.
        with open(LOGGING, 'w') as f_log:
            context = AppContext(f_log)

            context.logger.info('Opening control stream...')
            asyncio.create_task(handle_control_stream(context, f_ctrl))

            context.logger.info('Importing user module...')
            user_module = importlib.import_module(MODULE)

            result = await user_module.transform(context, stream.iterate(f_in))

            async with result.stream() as streamer:
                async for chunk in streamer:
                    await f_out.write(str(chunk))
                    await f_out.flush()


asyncio.run(main())
