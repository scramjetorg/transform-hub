import json


requires = {"contentType": "text/plain"}


def run(_context, input_stream):
    return input_stream.map(
        lambda chunk: json.dumps(
            {"chunk": chunk, "length": len(chunk)},
            ensure_ascii=False,
        ) + "\n"
    )
