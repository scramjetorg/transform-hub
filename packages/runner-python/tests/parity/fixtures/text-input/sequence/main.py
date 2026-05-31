requires = {"requires": "text-input", "contentType": "text/plain"}


def split_lines(part, chunk):
    return (part + chunk).split("\n")


def run(context, input_stream):
    return input_stream.sequence(split_lines, "").map(lambda line: f"line:{line}|")
