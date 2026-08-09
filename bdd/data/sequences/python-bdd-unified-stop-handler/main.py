import asyncio


async def main(context, input_stream, *args):
    stopped = asyncio.Event()

    async def on_stop(_timeout, _can_call_keepalive):
        print("Cleaning up... ", end="", flush=True)
        await asyncio.sleep(0)
        print("Cleanup done.", flush=True)
        stopped.set()

    context.add_stop_handler(on_stop)
    await stopped.wait()
