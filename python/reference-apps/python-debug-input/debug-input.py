import asyncio
from scramjet.streams import Stream

# Forward input to output, truncating long chunks and additionally
# printing to stdout for easier inspection.

def truncate(data):
    if len(data) > 60:
        return f'Got chunk: {data[:12]!r} ... {data[-12:]!r} (len: {len(data)})'
    else:
        return f'Got chunk: {data!r}'

def run(context, input):
    return (
        Stream
            .read_from(input, max_parallel=1)
            .each(lambda x: asyncio.sleep(0.5))
            .map(truncate)
            .each(print)
    )
