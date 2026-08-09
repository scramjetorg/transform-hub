import asyncio


requires = {"contentType": "text/plain"}


async def stop_handler(_timeout, _can_keep_alive):
    print("Cleaning up...", end="")
    await asyncio.sleep(0)
    print(" Cleanup done.")


async def run(context, _input):
    context.set_stop_handler(stop_handler)
    await asyncio.Event().wait()
