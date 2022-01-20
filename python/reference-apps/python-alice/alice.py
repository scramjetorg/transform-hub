import asyncio
import json
from scramjet.streams import Stream

async def delayed_hello(person):
    await asyncio.sleep(0.25)
    return f"Hello {person['name'].strip()}!"

def run(context, input):
    source = open('data.json')
    data = Stream.read_from(source, chunk_size=1024, max_parallel=1)
    return data.flatmap(json.loads).map(delayed_hello).each(print)
