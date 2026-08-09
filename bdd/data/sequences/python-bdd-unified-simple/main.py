async def main(_context, input_stream, *args):
    async for chunk in input_stream:
        yield f"Hello {chunk}!"
