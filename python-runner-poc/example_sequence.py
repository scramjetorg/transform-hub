import asyncio
import json
from aiostream import stream, pipe

async def transform(context, in_stream):
    async def process(chunk):
        data = json.loads(chunk)
        context.logger.info(f'Processing #{data["counter"]}')

        await asyncio.sleep(2)
        data['result'] = data['value']
        if hasattr(context, 'increment_result'):
            data['result'] += context.increment_result
        del data['value']

        context.logger.info(f'Finished #{data["counter"]}')
        return json.dumps(data) + '\n'

    return in_stream | pipe.map(process)

