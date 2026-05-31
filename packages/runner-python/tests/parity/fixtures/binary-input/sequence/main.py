requires = {"requires": "binary-input", "contentType": "application/octet-stream"}
provides = {"provides": "binary-output", "contentType": "application/octet-stream"}


def run(context, input_stream):
    return input_stream.map(lambda chunk: b"BIN:" + chunk + b":END")
