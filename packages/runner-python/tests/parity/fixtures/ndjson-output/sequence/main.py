import asyncio

provides = {"provides": "events", "contentType": "application/x-ndjson"}


async def run(context, input_stream):
    yield {"step": 1, "value": "alpha"}
    await asyncio.sleep(0.01)
    yield {"step": 2, "value": "beta"}
