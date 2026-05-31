requires = {"requires": "topic-renamed-in", "contentType": "text/plain"}


def run(_context, input_stream):
    stream = input_stream.map(lambda chunk: f"topic:{chunk}")
    stream.provides = "topic-renamed-out"
    stream.requires = "topic-renamed-in"
    stream.content_type = "text/plain"
    return stream
