requires = {
   'requires': 'pytopic-test',
   'contentType': 'text/plain'
}

def run(context, input):
    return input.map(lambda s: f'consumer got: {s}').each(print)
