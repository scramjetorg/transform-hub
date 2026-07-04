async def main(context, input_stream, *args):
    async for chunk in input_stream:
        yield f"saved to db: {chunk}"
