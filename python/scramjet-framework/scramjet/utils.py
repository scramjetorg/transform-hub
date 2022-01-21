import time
import asyncio
from scramjet.ansi_color_codes import *
import random

# Debugging helpers, testing and logging utilities.

random.seed('Pyfca')
MAX_DELAY = 0.3


def print_trimmed(item, color=grey):
    """For logging data that may be very long."""
    if (type(item) is str or type(item) is bytes) and len(item) > 32:
        result = f'{repr(item[:16])}..(length: {len(item)})'
    else:
        result = repr(item)
    return f'{color}{result}{reset}' if color else result


def pprint_chunk(item):
    """Print only the essential part of the chunk. For debugging."""
    if type(item) is dict and 'id' in item:
        return f'chunk_id={item["id"]}'
    else:
        return f'<chunk: {print_trimmed(item, color=False)}>'


def print_formatted(item):
    """Pretty-print for debugging various object types."""
    if isinstance(item, asyncio.Future):
        if hasattr(item, 'chunk'):
            default_info = item.__str__()[1:-1]  # trim < >
            return f'<{default_info} {pprint_chunk(item.chunk)}>'
        else:
            return item.__str__()
    else:  # most probably chunk
        return f'{grey}{pprint_chunk(item)}{reset}'


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
