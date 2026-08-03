import asyncio


requires = {"contentType": "text/plain"}


async def run(context, _input):
    context.logger.info("info-before-set")
    await asyncio.sleep(0.35)
    context.logger.info("info-after-set")
    await asyncio.Event().wait()
