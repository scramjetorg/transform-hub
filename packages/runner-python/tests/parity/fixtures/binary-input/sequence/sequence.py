import json


requires = {"contentType": "application/octet-stream"}


def run(_context, input_stream):
    return input_stream.map(
        lambda chunk: json.dumps(
            {"hex": chunk.hex(), "length": len(chunk)},
            ensure_ascii=False,
        ) + "\n"
    )
