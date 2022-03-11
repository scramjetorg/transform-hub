from scramjet.streams import Stream

def run(context, input: Stream):
    return input.map(len).each(print).map(lambda l: f"{l},")

