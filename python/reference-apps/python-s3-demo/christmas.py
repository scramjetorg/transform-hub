import asyncio
import sys
import random
from scramjet.streams import Stream

async def do_stuff(stream):
    stream.write('\nThis is a surprise Christmas demo. 🎄')
    stream.write('Connect to stdin via API (si inst stdin <instance id>)')
    stream.write('and enter your name to continue.')
    name = (await sys.stdin.read()).strip()

    text = [
        (2.0,  f'\nHello {name} :)\n'),
        (2.0, 'This sequence is written in python 🐍'),
        (1.0, 'and was executed'),
        (0.5, 'using python runner! 😀'),
        (2.0, 'As you can see, it can read stdin'),
        (0.5, 'and write to output. 💻'),
        (2.0, 'At the border between runner and sequence'),
        (0.5, "there's a little bit of python framework. 🚀"),
        (2.0,  f'\nMerry Christmas, {name}! 🎁\n'),
        (3.0,  f'PS everythin is done using duct tape for now, obviously 🩹 😉\n'),
    ]
    for delay, line in text:
        await asyncio.sleep(delay)
        stream.write(line)

    while True:
        await asyncio.sleep(2)
        stream.write(random.choice('🎄🎁🎀🐍🚀'))


async def run(context, input):
    stream = Stream()
    asyncio.create_task(do_stuff(stream))
    return stream.map(lambda s: s+'\n')
