from scramjet.streams import DataStream
import asyncio
from scramjet.ansi_color_codes import *


async def simple_stream_example():
    data = ['$8', '$25', '$3', '$14', '$20', '$9', '$13', '$16']
    print("Input:", data, '\n')
    stream = DataStream.read_from(data)
    result = await (
        stream
            .each(lambda x: print("Echo:", repr(x)))
            .map(lambda s: int(s[1:]))
            .filter(lambda x: x % 2 == 0)
            .map(lambda x: x/2)
            .map(lambda x: "$" + str(x))
            .each(lambda x: print("Echo:", repr(x)))
            .to_list()
    )
    print("\nOutput:", result)  # expected: ['$4.0', '$7.0', '$10.0', '$8.0']

print(f"\n{strong}Running simple_stream_example:{reset}")
asyncio.run(simple_stream_example())


import random
random.seed()

async def delayed_square(x):
    delay = round(random.uniform(0.1, 0.5), 2)
    print(f"Start processing {x} {blue}({delay}s){reset}")
    await asyncio.sleep(delay)
    print(f"Result: {x} -> {x**2}")
    return x**2

async def async_stream_example():
    result = await (
        DataStream
            .read_from(range(12), max_parallel=4)
            .map(delayed_square)
            .to_list()
    )
    print("\nOutput:", result)

print(f"\n{strong}Running async_stream_example:{reset}")
asyncio.run(async_stream_example())


# Chunk size can be controlled, and newlines don't affect it.
async def stream_from_file_example():
    path = 'test/sample_text_3.txt'
    with open(path) as file:
        print("Input:", file.read(), '\n')
    with open(path) as file:
        result = await (
            DataStream
                .read_from(file, chunk_size=32)
                .each(lambda x: print(f"Read: {repr(x)}"))
                .flatmap(lambda line: line.split())
                .to_list()
        )
        print("\nOutput:", result)

print(f"\n{strong}Running stream_from_file_example:{reset}")
asyncio.run(stream_from_file_example())
