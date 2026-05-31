import asyncio


async def run(context, input_stream):
    yield "Hello, "
    await asyncio.sleep(0.01)
    yield "World!"
