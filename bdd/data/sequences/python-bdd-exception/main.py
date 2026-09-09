def main(context, input_stream, *args):
    print("PYTHON_STDOUT_BEFORE_EXCEPTION", flush=True)
    raise Exception("TestException: This exception should appear on stderr")
