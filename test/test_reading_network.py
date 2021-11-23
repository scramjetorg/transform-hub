from datastream import DataStream
import asyncio
import pytest
from multiprocessing import Process
import os
import math
import test.large_test_files
import time


# Run in a separate process to avoid influence on tested code
class ServeOverTCP():
    def __init__(self, path, port):
        self.path = path
        self.port = port
        self.writer = Process(target=self.write)

    def __enter__(self):
        self.writer.start()
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):
        self.writer.terminate()
        self.writer.join()

    def write(self):
        os.system(f'nc -lN localhost {self.port} < {self.path}')

@pytest.mark.asyncio
async def test_reading_from_tcp_connection():
    path, fsize = test.large_test_files.file_with_newlines
    with open(path, 'rb') as file:
        data = file.read()
    with ServeOverTCP(path, 8888):
        reader, writer = await asyncio.open_connection('localhost', 8888)
        result = await DataStream.read_from(reader, chunk_size=16384).to_list()
        assert len(result) == math.ceil(fsize/16384)
        assert b''.join(result) == data
        writer.close()

@pytest.mark.asyncio
async def test_reading_from_tcp_connection_without_chunk_size():
    path = "sample_text_1.txt"
    with ServeOverTCP(path, 9999):
        reader, writer = await asyncio.open_connection('localhost', 9999)
        result = await DataStream.read_from(reader).to_list()
        assert result == [b'foo\n', b'bar baz\n', b'qux']
