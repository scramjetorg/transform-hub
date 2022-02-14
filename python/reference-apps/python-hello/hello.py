from scramjet.streams import Stream

def run(context, input):
    return Stream.read_from(input).map(lambda s: f"Hello {s}!")
