import asyncio


async def run(context, input_stream):
    yield "chunk-1\n"
    await asyncio.sleep(0.05)
    yield "chunk-2\n"
    await asyncio.sleep(0.05)
    yield "chunk-3\n"
