import asyncio
import json
from datetime import datetime
from aiostream import stream, pipe

def with_time(text):
    print(f'{datetime.now().strftime("%H:%M:%S")} - {text}')

async def transform(stream, context):
    async def process(chunk):
        data = json.loads(chunk)
        with_time(f'Processing #{data["counter"]}')

        await asyncio.sleep(2)
        data['result'] = data['value']
        if 'add' in context:
            data['result'] += context['add']
        del data['value']

        with_time(f'Finished #{data["counter"]}')
        return json.dumps(data) + '\n'

    return stream | pipe.map(process)

