import asyncio


requires = {"contentType": "text/plain"}


async def run(context, _input):
    context.set_health_check(lambda: {"healthy": False, "reason": "fixture-health-override"})
    await asyncio.Event().wait()
