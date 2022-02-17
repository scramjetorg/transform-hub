import asyncio

async def stop_handler():
    print("Cleaning up...", end=' ')
    await asyncio.sleep(1)
    print("Cleanup done.")

async def run(context, input):
    context.set_stop_handler(stop_handler)
    await asyncio.sleep(10**9)
