# pyright: reportMissingImports=false
import asyncio

from scramjet.streams import Stream


requires = {"contentType": "text/plain"}


async def run(context, _input):
    loop = asyncio.get_running_loop()
    future = loop.create_future()

    def on_test_event(message=None):
        if not future.done():
            future.set_result(message)
        context.emit("test-response", f"reply to {message}")

    context.on("test-event", on_test_event)
    context.emit("sequence-ready", {"status": "listening"})
    message = await future
    return Stream.from_iterable([f"received:{message}\n"])
