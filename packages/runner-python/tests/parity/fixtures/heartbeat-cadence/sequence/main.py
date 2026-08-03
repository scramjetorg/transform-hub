import asyncio


async def run(context, input_stream):
    await asyncio.sleep(2.25)
    yield "heartbeat-done"
