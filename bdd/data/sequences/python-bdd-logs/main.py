import asyncio


async def main(context, input_stream, *args):
    context.logger.info("Debug log message")
    # Stay alive briefly so the log message can be captured.
    await asyncio.sleep(1)
