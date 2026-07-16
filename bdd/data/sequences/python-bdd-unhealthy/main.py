import asyncio


async def main(context, input_stream, *args):
    context.set_health_check(lambda: {"healthy": False})
    # Keep the instance observable until the scenario's normal teardown kills
    # it.  A fixed lifetime can end while the health assertion is polling,
    # making this test depend on scheduling rather than the health contract.
    await asyncio.Event().wait()
    yield "unhealthy-done"
