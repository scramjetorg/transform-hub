import asyncio
from scramjet.streams import Stream

async def run(context, input):
    context.set_health_check(lambda: {'healthy': False})
    data = (
        Stream
        .read_from(range(40), max_parallel=1)
        .map(lambda x: str(x))
        .each(lambda x: asyncio.sleep(1))
    )
    return data.each(lambda x: print({ 'x': x }))
