import asyncio

async def run(context, input):
    context.logger.debug('Debug log message')
    context.logger.info('Info log message')
    context.logger.warn('Warn log message')
    await asyncio.sleep(10)
