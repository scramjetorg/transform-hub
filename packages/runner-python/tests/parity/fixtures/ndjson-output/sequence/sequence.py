# pyright: reportMissingImports=false
from scramjet.streams import Stream


requires = {"contentType": "text/plain"}


def run(_context, _input):
    stream = Stream.from_iterable([
        {"index": 1, "label": "alpha"},
        {"index": 2, "label": "beta"},
    ])
    stream.provides = ""
    stream.content_type = "application/x-ndjson"
    return stream
