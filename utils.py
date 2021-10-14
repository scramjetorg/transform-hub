import time
import asyncio
from os import environ
from ansi_color_codes import *
import random

# Debugging helpers, testing and logging utilities.

random.seed('Pyfca')
MAX_DELAY = 0.3

def print_formatted(item):
    """Pretty-print for debugging."""
    if isinstance(item, asyncio.Future):
        if hasattr(item, 'chunk'):
            default_info = item.__str__()[1:-1]  # trim < >
            return f'<{default_info} {chunk_id_or_value(item.chunk)}>'
        else:
            return item.__str__()
    else:  # most probably chunk
        return f'{grey}{chunk_id_or_value(item)}{reset}'

def chunk_id_or_value(item):
    """For uniform debugging various types of test data."""
    if type(item) is dict and 'id' in item:
        return f'chunk_id={item["id"]}'
    elif hasattr(item, 'id'):
        return f'chunk_id={item.id}'
    else:
        return f'<chunk: {repr(item)}>'

async def mock_delay(data):
    """Pretend that we run some async operations that take some time."""
    delay = 0
    if type(data) is dict and 'delay' in data:
        delay = data['delay']
    else:
        delay = random.uniform(0, MAX_DELAY)
    if delay:
        await asyncio.sleep(delay)

class _LogWithTimer:
    """Simple logger with time counted from initialization -
    makes it easier to follow timing relationships than absolute time."""
    def __init__(self, epoch=time.perf_counter()):
        self.epoch = epoch

    def log(self, *args):
        time_delta = time.perf_counter() - self.epoch
        print(f'{time_delta:10.6f}', *args)

    def reset(self):
        self.epoch = time.perf_counter()

# expose singleton for synchronization across modules using it
LogWithTimer = _LogWithTimer()
