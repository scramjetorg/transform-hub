def run(context, input_stream):
    print("stdout-before-boom")
    raise Exception("boom")
