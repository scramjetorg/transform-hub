import asyncio
import logging


async def run(context, input_stream):
    context.emit("set-ready", {"level": context.logger.getEffectiveLevel()})
    for _ in range(10):
        if context.logger.isEnabledFor(logging.DEBUG):
            yield "debug-enabled"
            return
        await asyncio.sleep(0.05)
    yield "debug-disabled"
