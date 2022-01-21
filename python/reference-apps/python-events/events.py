import asyncio

async def run(context, input):
    def respond_to_event(message):
        context.emit('test-response', f'reply to {message}')

    context.on('test-event', respond_to_event)
    await asyncio.sleep(60)
