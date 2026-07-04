import asyncio


async def main(context, input_stream, *args):
    context.set_health_check(lambda: {"healthy": False})
    # Keep alive long enough for the health check to be polled.
    await asyncio.sleep(2)
    yield "unhealthy-done"
