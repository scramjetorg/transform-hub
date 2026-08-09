requires = {"contentType": "text/plain"}


async def run(_context, input_stream):
    async def generator():
        async for chunk in input_stream:
            yield f"saved to db: {chunk.rstrip()}\n"

    return generator()
