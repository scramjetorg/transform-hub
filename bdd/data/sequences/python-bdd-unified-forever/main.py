import asyncio


async def main(_context, input_stream, *args):
    await asyncio.Event().wait()
