import time
import asyncio
from os import environ
from ansi_color_codes import *

# Debugging helpers and logging utilities.
DEBUG = 'PYFCA_DEBUG' in environ

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
    elif isinstance(item, object) and hasattr(item, 'id'):
        return f'chunk_id={item.id}'
    else:
        return f'<chunk: {item}>'

def update_status(item, status):
    """Write status in chunk object itself (if possible) for detailed tracing."""
    if DEBUG:
        if type(item) is dict:
            item["_pyfca_status"] = status
        # exclude numbers, strings etc. that don't allow assigning an attribute
        elif hasattr(item, '__dict__'):
            item._pyfca_status = status

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
