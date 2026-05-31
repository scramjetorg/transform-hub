import asyncio


requires = {"contentType": "text/plain"}


async def run(context, _input):
    context.logger.info("awaiting-kill")
    await asyncio.Event().wait()
