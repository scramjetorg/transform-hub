from scramjet.streams import Stream

def run(context, input, named_arg, *wildcard_args):
    output = {'named_arg': named_arg, 'wildcard_args': wildcard_args}
    return Stream.read_from(f"{output}")
