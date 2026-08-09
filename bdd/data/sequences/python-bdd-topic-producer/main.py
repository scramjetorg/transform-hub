provides = {"topic": "topic-test", "content_type": "text/plain"}


async def main(context, input_stream, *args):
    async for chunk in input_stream:
        yield f"producer got: {chunk}\n"
