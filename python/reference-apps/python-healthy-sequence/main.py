import asyncio
from scramjet.streams import Stream

async def run(context, input):
    data = (
        Stream
        .read_from(range(4), max_parallel=1)
        .map(lambda x: str(x))
        .each(lambda x: asyncio.sleep(1))
    )
    return data.each(lambda x: print({ 'x': x }))
