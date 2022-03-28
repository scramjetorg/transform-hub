provides = {
   'provides': 'pytopic-test',
   'contentType': 'text/plain'
}

def run(context, input):
    return input.map(lambda s: f'producer got: {s}' + "\n").each(print)
