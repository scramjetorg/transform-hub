from datastream import DataStream
import asyncio
import pytest
from multiprocessing import Process
import os
import math
import test.large_test_files
import time

@pytest.mark.asyncio
async def test_stream_from_file_opened_as_text_carries_strings():
    with open("sample_text_0.txt") as file:
        result = await DataStream.read_from(file).to_list()
        assert result == ['foo\n']

@pytest.mark.asyncio
async def test_stream_from_file_opened_as_binary_carries_bytes():
    with open("sample_text_0.txt", 'rb') as file:
        result = await DataStream.read_from(file).to_list()
        assert result == [b'foo\n']

@pytest.mark.asyncio
async def test_no_chunk_size_in_text_mode():
    with open("sample_text_1.txt") as file:
        result = await DataStream.read_from(file).to_list()
        assert result == ['foo\n', 'bar baz\n', 'qux']

@pytest.mark.asyncio
async def test_no_chunk_size_in_binary_mode():
    with open("sample_text_1.txt", 'rb') as file:
        result = await DataStream.read_from(file).to_list()
        assert result == [b'foo\n', b'bar baz\n', b'qux']

@pytest.mark.asyncio
async def test_specifying_chunk_size_in_text_mode():
    SIZE = 32
    with open("sample_text_3.txt") as file:
        result = await DataStream.read_from(file, chunk_size=SIZE).to_list()
        for chunk in result[:-1]:  # last one may be smaller
            assert len(chunk) == SIZE
        assert len(result[-1]) <= SIZE

@pytest.mark.asyncio
async def test_specifying_chunk_size_in_binary_mode():
    SIZE = 32
    with open("sample_text_3.txt", 'rb') as file:
        result = await DataStream.read_from(file, chunk_size=SIZE).to_list()
        for chunk in result[:-1]:  # last one may be smaller
            assert len(chunk) == SIZE
        assert len(result[-1]) <= SIZE

@pytest.mark.asyncio
async def test_chunk_size_with_multibyte_chars_in_text_mode():
    with open('sample_multibyte_text.txt') as file:
        individual_letters = [c for c in file.read()]
    with open('sample_multibyte_text.txt') as file:
        # each chunk should be a complete unicode character
        result = await DataStream.read_from(file, chunk_size=1).to_list()
        assert result == individual_letters

@pytest.mark.asyncio
async def test_chunk_size_with_multibyte_chars_in_binary_mode():
    with open('sample_multibyte_text.txt') as file:
        individual_letters = [c for c in file.read()]
    with open('sample_multibyte_text.txt', 'rb') as file:
        # with chunk_size=1 each byte should become separate chunk,
        # yielding chunks that are not valid UTF.
        result = await DataStream.read_from(file, chunk_size=1).to_list()
        assert len(result) > len(individual_letters)
        with pytest.raises(UnicodeDecodeError):
            for chunk in result:
                letter = chunk.decode("UTF-8")

@pytest.mark.asyncio
async def test_reading_large_file_in_chunks():
    path, fsize = test.large_test_files.file_with_newlines
    with open(path) as file:
        result = await DataStream.read_from(file, chunk_size=16384).to_list()
        # chunks should be unrelated to lines in input file
        assert len(result) == math.ceil(fsize/16384)

@pytest.mark.asyncio
async def test_reading_large_file_without_newlines():
    path, fsize = test.large_test_files.file_without_newlines
    with open(path) as file:
        result = await DataStream.read_from(file).to_list()
        assert len(result) == 1
        assert len(result[0]) == fsize


# Run in a separate process to avoid influence on tested code
class WriteInIntervals():
    def __init__(self, path, data, interval=0.01):
        self.path, self.data, self.interval = path, data, interval
        self.writer = Process(target=self.write)

    def __enter__(self):
        self.writer.start()
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):
        self.writer.join()

    def write(self):
        with open(self.path, 'w') as pipe:
            for chunk in self.data:
                time.sleep(self.interval)
                print(f'Write into {repr(self.path)}: {repr(chunk)}')
                pipe.write(chunk)
                pipe.flush()

@pytest.mark.asyncio
async def test_waiting_for_complete_chunk():
    pipe_path = 'test_pipe'
    data = ['foo', '\n', 'bar baz', ' ', 'bax\nqux']
    with WriteInIntervals(pipe_path, data):
        with open(pipe_path) as file:
            result = await DataStream.read_from(file, chunk_size=8).to_list()
            # all except last chunk should have specified size,
            # even though some data will be available for reading earlier.
            assert result == ['foo\nbar ', 'baz bax\n', 'qux']
