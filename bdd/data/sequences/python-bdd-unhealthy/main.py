async def main(context, input_stream, *args):
    context.set_health_check(lambda: {"healthy": False})
    yield "unhealthy-done"
