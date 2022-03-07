import asyncio
from scramjet.streams import Stream

# Demo use of topics, events, stop handler
# & run this in docker on STH installed from NPM.

requires = {
   'requires': 's7-demo-input',
   'contentType': 'text/plain'
}

provides = {
   'provides': 's7-demo-output',
   'contentType': 'text/plain'
}

class config:
    delay = 2


async def run(ctx, input):
    def set_delay(data):
        try:
            config.delay = float(data)
        except ValueError:
            ctx.logger.error(f"Invalid rate: {repr(data)}")

    ctx.on('change-rate', set_delay)

    async def call_for_help():
        ctx.emit('sos', "Help! I'm being attacked!")
        config.delay = 0.2
        await asyncio.sleep(3)
        ctx.logger.warn("No help came, surrender...")

    ctx.set_stop_handler(call_for_help)

    return (
        Stream.read_from(input, max_parallel=1)
            .each(lambda x: asyncio.sleep(config.delay))
            .map(lambda x: (len(x), x))
            .each(debug)
    )


def debug(data):
    length, text = data
    trimmed = text if len(text) < 32 else text[:30]+'...'
    print(f"{length}, {repr(trimmed)}")


output_type = "application/x-ndjson"
