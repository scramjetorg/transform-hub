import asyncio


async def run(context, input_stream):
    stopped = asyncio.Event()

    async def on_stop(timeout, can_call_keepalive):
        context.emit("stop-handler-ran", {"timeout": timeout, "canCallKeepalive": can_call_keepalive})
        stopped.set()

    context.set_stop_handler(on_stop)
    context.emit("stop-handler-ready", {"registered": True})
    await stopped.wait()
