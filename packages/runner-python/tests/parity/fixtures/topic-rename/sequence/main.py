requires = {"requires": "topic-in-renamed", "contentType": "text/plain"}
provides = {"provides": "topic-out-renamed", "contentType": "text/plain"}


async def run(context, input_stream):
    yield "topic-rename-ok"
