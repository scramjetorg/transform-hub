import asyncio


async def run(context, input_stream):
    context.emit("kill-ready", {"status": "waiting"})
    await asyncio.Event().wait()
