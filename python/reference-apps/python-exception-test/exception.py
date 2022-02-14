class TestException(Exception): pass

def run(context, input):
    raise TestException("This exception should appear on stderr")
