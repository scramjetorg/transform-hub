"""Small real hosted-Python AppContext integration fixture."""

import asyncio


async def _app(scope, receive, send):
    if scope["type"] != "http":
        return
    await receive()
    await send(
        {
            "type": "http.response.start",
            "status": 200,
            "headers": [(b"content-type", b"application/json")],
        }
    )
    await send({"type": "http.response.body", "body": b'{"runtime":"python"}'})


def main(context, input_stream, *args):
    context.add_monitoring_handler(
        lambda: {"healthy": True, "details": {"runtime": "python"}}
    )
    context.logger.info("hosted-python-appcontext-log", extra={"runtime": "python"})
    context.api.attach(_app)

    received = asyncio.Event()

    def on_event(message):
        context.emit_to_space("hosted-python-response", {"body": message})
        received.set()

    context.on("hosted-python-event", on_event)

    async def run():
        await context.hub.get("/status")
        await context.space.get("/hubs")
        await context.keep_alive(15000)
        await asyncio.sleep(1)
        print("hosted-python-appcontext", flush=True)
        await received.wait()
        context.end()

    return run()
