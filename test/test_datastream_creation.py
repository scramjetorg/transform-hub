from datastream import DataStream, UnsupportedOperation
import asyncio
from ansi_color_codes import *
import pytest

# test cases

@pytest.mark.asyncio
async def test_creating_stream_using_constructor():
    stream = DataStream()
    assert isinstance(stream, DataStream)

@pytest.mark.asyncio
async def test_creating_stream_from_list():
    stream = DataStream.from_iterable([1, 2, 3, 4])
    assert [1, 2, 3, 4] == await stream.to_list()

@pytest.mark.asyncio
async def test_creating_stream_from_empty_list():
    stream = DataStream.from_iterable([])
    assert [] == await stream.to_list()

@pytest.mark.asyncio
async def test_creating_stream_from_set():
    stream = DataStream.from_iterable({1, 2, 3, 4})
    assert [1, 2, 3, 4] == await stream.to_list()

@pytest.mark.asyncio
async def test_creating_stream_from_string():
    stream = DataStream.from_iterable('abcd')
    assert ['a', 'b', 'c', 'd'] == await stream.to_list()

@pytest.mark.asyncio
async def test_creating_stream_from_dict_keys():
    test_input = {'a': 1, 'b': 2, 'c': 3, 'd': 4}
    stream = DataStream.from_iterable(test_input)
    assert ['a', 'b', 'c', 'd'] == await stream.to_list()

@pytest.mark.asyncio
async def test_creating_stream_from_dict_items():
    test_input = {'a': 1, 'b': 2, 'c': 3, 'd': 4}
    stream = DataStream.from_iterable(test_input.items())
    assert test_input == dict(await stream.to_list())

@pytest.mark.asyncio
async def test_creating_stream_from_generator():
    stream = DataStream.from_iterable(range(4))
    assert [0, 1, 2, 3] == await stream.to_list()

@pytest.mark.asyncio
async def test_creating_stream_from_file_object():
    with open("sample_text_1.txt") as f:
        stream = DataStream.from_iterable(f)
        assert ['foo\n', 'bar baz\n', 'qux'] == await stream.to_list()

@pytest.mark.asyncio
async def test_specifying_chunk_size_on_plain_iterable():
    with pytest.raises(UnsupportedOperation):
        result = DataStream.read_from([1, 2, 3, 4], chunk_size=2)

@pytest.mark.asyncio
async def test_non_iterable_source_without_chunk_size():
    class Foo():
        def read(self, how_many):
            return "" + "foo"*how_many

    with pytest.raises(UnsupportedOperation):
        DataStream.read_from(Foo())

class AsyncCountUntil():
    def __init__(self, max) -> None:
        self.limit = max

    async def __aiter__(self):
        for i in range(self.limit):
            await asyncio.sleep(0.01)
            yield i+1

@pytest.mark.asyncio
async def test_creating_stream_from_async_iterable():
    stream = DataStream.read_from(AsyncCountUntil(8))
    assert [1, 2, 3, 4, 5, 6, 7, 8] == await stream.to_list()

@pytest.mark.asyncio
async def test_creating_stream_from_another_stream():
    s1 = DataStream.read_from(range(8))
    s2 = DataStream.read_from(s1).map(lambda x: x*2)
    s3 = DataStream.read_from(s2)
    assert [0, 2, 4, 6, 8, 10, 12, 14] == await s3.to_list()

@pytest.mark.asyncio
async def test_iterating_over_a_stream():
    stream = DataStream.read_from(range(8))
    result = [chunk async for chunk in stream]
    assert [0, 1, 2, 3, 4, 5, 6, 7] == result
