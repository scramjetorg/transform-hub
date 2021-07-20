import asyncio

async def transform(data, context):
    await asyncio.sleep(2)  # do some IO-bound processing
    data['result'] = data['value']
    if 'args' in context:
        data['result'] += context['args']
    del data['value']
    return data
