from datastream import DataStream
from multiprocessing import Process
import asyncio
import os
import time
from ansi_color_codes import *


async def echo(x):
    print(f"{yellow}Got:{reset} {repr(x)}")
    return x

# test cases

# this doesn't deal with buffering, but is here for comparison
async def test_transformations_on_data_from_file_object():
    with open("sample_numbers_1.txt") as f:
        stream = DataStream.from_iterable(f, max_parallel=4)
        result = await (
            stream
                .map(echo)
                .map(lambda s: int(s.strip()))
                .filter(lambda x: x % 2 == 0)
                .map(lambda x: x**2)
                .map(lambda x: str(x))
                .to_list()
        )
        assert result == ['64', '196', '400', '256']

async def test_reading_from_file():
    stream = DataStream.from_file('sample_text_1.txt').map(echo)
    assert [b'foo\nbar baz\nqux'] == await stream.to_list()

async def test_reading_and_writing_to_file():
    await DataStream.from_file('sample_text_1.txt').to_file('test_output')
    with open('sample_text_1.txt') as source, open('test_output') as dest:
        assert source.read() == dest.read()

# Newlines in input shouldn't trigger splitting into chunks.
async def test_reading_text_with_newlines():
    # verify that input file is suitable for this test
    with open('sample_text_1.txt') as source:
        assert len(source.readlines()) > 1
    chunks = await DataStream.from_file('sample_text_1.txt').to_list()
    assert len(chunks) == 1

# Files that exceed read size should be processed in chunks.
async def test_reading_large_file_in_default_chunks():
    FILE = 'sample_text_2.txt'
    # verify that input file is suitable for this test
    with open(FILE) as source:
        assert len(source.read()) > 4096  # default read1() chunk size
    chunks = await DataStream.from_file(FILE).to_list()
    assert len(chunks) > 1

# Chunk size can be controlled, and newlines don't affect it.
async def test_controlling_chunk_size():
    SIZE = 32
    FILE = 'sample_text_3.txt'
    # verify that input file is suitable for this test
    with open(FILE) as source:
        contents = source.read()
        assert len(contents) > 2*SIZE
        assert contents.find('\n') == -1
    chunks = await DataStream.from_file(FILE, max_chunk_size=SIZE).to_list()
    assert len(chunks) > 2

async def test_reading_data_as_it_arrives():
    data = ['f', 'oo', '\n', 'bar', ' ', 'baz\nqux']
    path = 'test_pipe'

    def write_to_pipe():
        with open(path, 'w') as pipe:
            for chunk in data:
                time.sleep(0.1)
                print(f'Write into {repr(path)}:', repr(chunk))
                pipe.write(chunk)
                pipe.flush()

    os.remove(path)
    os.mkfifo(path)
    # Run in a separate process to avoid having to juggle reads and writes
    write = Process(target=write_to_pipe)
    write.start()
    result = await DataStream().from_file(path).map(echo).to_list()
    # Each piece of data written into the pipe should become a separate chunk.
    assert len(result) == len(data)
    write.join()

# Main test execution loop

tests_to_run = [
    test_transformations_on_data_from_file_object,
    test_reading_from_file,
    test_reading_and_writing_to_file,
    test_reading_text_with_newlines,
    test_reading_large_file_in_default_chunks,
    test_controlling_chunk_size,
    test_reading_data_as_it_arrives,
]

for test in tests_to_run:
    print(f"\n\nRunning {strong}{test.__name__}{reset}:\n")
    asyncio.run(test())
