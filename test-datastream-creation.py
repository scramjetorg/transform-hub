from datastream import DataStream
import asyncio
from ansi_color_codes import *


# test cases

async def test_creating_stream_using_constructor():
    stream = DataStream()
    assert isinstance(stream, DataStream)

async def test_creating_stream_from_list():
    stream = DataStream.from_iterable([1, 2, 3, 4])
    assert [1, 2, 3, 4] == await stream.to_list()

async def test_creating_stream_from_empty_list():
    stream = DataStream.from_iterable([])
    assert [] == await stream.to_list()

async def test_creating_stream_from_set():
    stream = DataStream.from_iterable({1, 2, 3, 4})
    assert [1, 2, 3, 4] == await stream.to_list()

async def test_creating_stream_from_string():
    stream = DataStream.from_iterable('abcd')
    assert ['a', 'b', 'c', 'd'] == await stream.to_list()

async def test_creating_stream_from_dict_keys():
    test_input = {'a': 1, 'b': 2, 'c': 3, 'd': 4}
    stream = DataStream.from_iterable(test_input)
    assert ['a', 'b', 'c', 'd'] == await stream.to_list()

async def test_creating_stream_from_dict_items():
    test_input = {'a': 1, 'b': 2, 'c': 3, 'd': 4}
    stream = DataStream.from_iterable(test_input.items())
    assert test_input == dict(await stream.to_list())

async def test_creating_stream_from_generator():
    stream = DataStream.from_iterable(range(4))
    assert [0, 1, 2, 3] == await stream.to_list()

async def test_creating_stream_from_file_object():
    with open("sample_text_1.txt") as f:
        stream = DataStream.from_iterable(f)
        assert ['foo\n', 'bar baz\n', 'qux'] == await stream.to_list()


# Main test execution loop

tests_to_run = [
    test_creating_stream_using_constructor,
    test_creating_stream_from_list,
    test_creating_stream_from_empty_list,
    test_creating_stream_from_set,
    test_creating_stream_from_string,
    test_creating_stream_from_dict_keys,
    test_creating_stream_from_dict_items,
    test_creating_stream_from_generator,
    test_creating_stream_from_file_object,
]

for test in tests_to_run:
    print(f"\n\nRunning {strong}{test.__name__}{reset}:\n")
    asyncio.run(test())
