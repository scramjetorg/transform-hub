requires = {"contentType": "text/plain"}


def run(_context, _input):
    print("stdout-before-error")
    raise RuntimeError("boom after stdout")
