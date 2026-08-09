import asyncio


async def run(context, input_stream):
    context.set_health_check(lambda: {"healthy": False, "reason": "fixture"})
    await asyncio.sleep(1.2)
    yield "health-override-done"
