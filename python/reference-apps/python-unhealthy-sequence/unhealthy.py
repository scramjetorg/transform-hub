import asyncio

async def run(context, input):
    context.set_health_check(lambda: {'healthy': False})
    await asyncio.sleep(1000)
