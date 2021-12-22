import asyncio
import sys
import random
from scramjet.streams import Stream

async def do_stuff(stream):
    stream.write('\nTo jest niespodziankowe świąteczne demo. 🎄')
    stream.write('Połącz się przez API do stdin (si inst stdin <instance id>)')
    stream.write('i wpisz swoje imię, żeby kontynuować.')
    name = (await sys.stdin.read()).strip()

    text = [
        (2.0,  f'\nHej {name} :)\n'),
        (2.0, 'Ta sekwencja jest napisana w Pythonie 🐍'),
        (1.0, 'i została uruchomiona'),
        (0.5, 'za pomocą Pythonowego runnera! 😀'),
        (2.0, 'Jak widać, potrafi czytać z stdin'),
        (0.5, 'i pisać na output. 💻'),
        (2.0, 'Na styku sekwencji i runnera'),
        (0.5, 'jest odrobina pythonowego frameworka. 🚀'),
        (2.0,  f'\nWesołych Świąt, {name}! 🎁\n'),
        (3.0,  f'PS oczywiście na razie wszystko jest zrobione na taśmę klejącą 🩹 😉\n'),
    ]
    for delay, line in text:
        await asyncio.sleep(delay)
        stream.write(line)

    while True:
        await asyncio.sleep(2)
        stream.write(random.choice('🎄🎁🎀🐍🚀'))


async def run(input):
    stream = Stream()
    asyncio.create_task(do_stuff(stream))
    return stream.map(lambda s: s+'\n')
