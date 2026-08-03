# pyright: reportMissingImports=false
from scramjet.streams import Stream


requires = {"contentType": "text/plain"}


def run(_context, _input):
    return Stream.from_iterable(["Hello, ", "World!\n"])
