from collections import namedtuple
from scramjet.streams import Stream
import pytest
from multiprocessing import Process, Value
import math
import test.large_test_files
import time
import aiofiles

@pytest.mark.asyncio
async def test_stream_from_file_opened_as_text_carries_strings():
    with open("test/sample_text_0.txt") as file:
        result = await Stream.read_from(file).to_list()
        assert result == ['foo\n']

@pytest.mark.asyncio
async def test_stream_from_file_opened_as_binary_carries_bytes():
    with open("test/sample_text_0.txt", 'rb') as file:
        result = await Stream.read_from(file).to_list()
        assert result == [b'foo\n']

@pytest.mark.asyncio
async def test_no_chunk_size_in_text_mode():
    with open("test/sample_text_1.txt") as file:
        result = await Stream.read_from(file).to_list()
        assert result == ['foo\n', 'bar baz\n', 'qux']

@pytest.mark.asyncio
async def test_no_chunk_size_in_binary_mode():
    with open("test/sample_text_1.txt", 'rb') as file:
        result = await Stream.read_from(file).to_list()
        assert result == [b'foo\n', b'bar baz\n', b'qux']

@pytest.mark.asyncio
async def test_specifying_chunk_size_in_text_mode():
    SIZE = 32
    with open("test/sample_text_3.txt") as file:
        result = await Stream.read_from(file, chunk_size=SIZE).to_list()
        for chunk in result[:-1]:  # last one may be smaller
            assert len(chunk) == SIZE
        assert len(result[-1]) <= SIZE

@pytest.mark.asyncio
async def test_specifying_chunk_size_in_binary_mode():
    SIZE = 32
    with open("test/sample_text_3.txt", 'rb') as file:
        result = await Stream.read_from(file, chunk_size=SIZE).to_list()
        for chunk in result[:-1]:  # last one may be smaller
            assert len(chunk) == SIZE
        assert len(result[-1]) <= SIZE

@pytest.mark.asyncio
async def test_chunk_size_with_multibyte_chars_in_text_mode():
    with open('test/sample_multibyte_text.txt') as file:
        individual_letters = [c for c in file.read()]
    with open('test/sample_multibyte_text.txt') as file:
        # each chunk should be a complete unicode character
        result = await Stream.read_from(file, chunk_size=1).to_list()
        assert result == individual_letters

@pytest.mark.asyncio
async def test_chunk_size_with_multibyte_chars_in_binary_mode():
    with open('test/sample_multibyte_text.txt') as file:
        individual_letters = [c for c in file.read()]
    with open('test/sample_multibyte_text.txt', 'rb') as file:
        # with chunk_size=1 each byte should become separate chunk,
        # yielding chunks that are not valid UTF.
        result = await Stream.read_from(file, chunk_size=1).to_list()
        assert len(result) > len(individual_letters)
        with pytest.raises(UnicodeDecodeError):
            for chunk in result:
                letter = chunk.decode("UTF-8")

@pytest.mark.asyncio
async def test_reading_large_file_in_chunks():
    path, fsize = test.large_test_files.file_with_newlines
    with open(path) as file:
        result = await Stream.read_from(file, chunk_size=16384).to_list()
        # chunks should be unrelated to lines in input file
        assert len(result) == math.ceil(fsize/16384)

@pytest.mark.asyncio
async def test_reading_large_file_without_newlines():
    path, fsize = test.large_test_files.file_without_newlines
    with open(path) as file:
        result = await Stream.read_from(file).to_list()
        assert len(result) == 1
        assert len(result[0]) == fsize


# Run in a separate process to avoid influence on tested code
class WriteInIntervals():
    def __init__(self, path, data, counter=None, interval=0.01):
        self.path, self.data = path, data
        self.counter, self.interval = counter, interval
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
                if self.counter:
                    self.counter.value += 1
                pipe.write(chunk)
                pipe.flush()

@pytest.mark.asyncio
async def test_waiting_for_complete_chunk(named_pipe):
    data = ['foo', '\n', 'bar baz', ' ', 'bax\nqux']
    with WriteInIntervals(named_pipe, data):
        with open(named_pipe) as file:
            result = await Stream.read_from(file, chunk_size=8).to_list()
            # all except last chunk should have specified size,
            # even though some data will be available for reading earlier.
            assert result == ['foo\nbar ', 'baz bax\n', 'qux']

@pytest.mark.asyncio
async def test_processing_start_with_sync_source(named_pipe):
    data = ['foo\n', 'bar\n', 'baz\n', 'bax\n', 'qux\n']
    chunks_written = Value('i', 0)
    write_counts = []

    def log_how_many_written(chunk):
        write_counts.append(chunks_written.value)
        return chunk

    with WriteInIntervals(named_pipe, data, chunks_written):
        with open(named_pipe) as file:
            max_parallel = 3
            s = Stream.read_from(file, max_parallel=max_parallel)
            result = await s.map(log_how_many_written).to_list()
            # Since input is sync, processing of the first chunk should start
            # only after max_parallel chunks are read from (and written to)
            # the pipe (but it should not wait until all data is read).
            assert write_counts[0] == max_parallel < len(data)
            assert result == data

@pytest.mark.asyncio
async def test_processing_start_with_async_source(named_pipe):
    data = ['foo\n', 'bar\n', 'baz\n', 'bax\n', 'qux\n']
    chunks_written = Value('i', 0)
    chunks_read = Value('i', 0)
    read_vs_written = []
    record = namedtuple('record', ['read', 'written'])

    def log_read_vs_written(chunk):
        chunks_read.value += 1
        read_vs_written.append(
            record(chunks_read.value, chunks_written.value)
        )
        return chunk

    with WriteInIntervals(named_pipe, data, chunks_written):
        async with aiofiles.open(named_pipe) as file:
            s = Stream.read_from(file)
            result = await s.map(log_read_vs_written).to_list()
            # Since input is async, processing of each chunk should start
            # immediately after it is written to the pipe.
            for record in read_vs_written:
                assert record.read == record.written
            assert result == data
