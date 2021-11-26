from datastream import DataStream
import asyncio
from ansi_color_codes import *

def echo(x):
    print(f"{yellow}Echo:{reset} {repr(x)}")
    return x

async def simple_stream_example():
    data = ['8', '25', '3', '14', '20', '9', '13', '16']
    print("Input:", data)
    stream = DataStream.read_from(data, max_parallel=4)
    result = await (
        stream
            .map(echo)
            .map(lambda s: int(s))
            .filter(lambda x: x % 2 == 0)
            .map(lambda x: x**2)
            .map(lambda x: "$" + str(x))
            .map(echo)
            .to_list()
    )  # expected: ['$64', '$196', '$400', '$256']
    print("Output:", result)

print(f"\n{strong}Running simple_stream_example:{reset}")
asyncio.run(simple_stream_example())


import random
random.seed()

async def mock_delay(x):
    delay = round(random.uniform(0, 0.2), 2)
    print(f"Processing {repr(x)}: {blue}{delay}s{reset}")
    await asyncio.sleep(delay)

async def async_square(x):
    await mock_delay(x)
    return x**2

async def async_stream_example():
    result = await (
        DataStream
            .read_from(range(10), max_parallel=4)
            .map(async_square)
            .map(echo)
            .to_list()
    )
    print("Output:", result)

print(f"\n{strong}Running async_stream_example:{reset}")
asyncio.run(async_stream_example())


# Chunk size can be controlled, and newlines don't affect it.
async def stream_from_file_example():
    path = 'sample_text_3.txt'
    with open(path) as file:
        print("Input:", file.read())
    with open(path) as file:
        result = await (
            DataStream
                .read_from(file, chunk_size=32)
                .map(echo)
                .flatmap(lambda line: line.split())
                .to_list()
        )
        print("Output:", result)

print(f"\n{strong}Running stream_from_file_example:{reset}")
asyncio.run(stream_from_file_example())
