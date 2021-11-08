from datastream import DataStream
import asyncio
import pyfca
import utils
from ansi_color_codes import *
from pprint import pprint
import pytest

log = utils.LogWithTimer.log
fmt = utils.print_formatted

@pytest.fixture(autouse=True)
def reset_timer():
    utils.LogWithTimer.reset()


@pytest.mark.asyncio
async def test_flattening_lists():
    data = ["foo\nbar", "cork", "qux\nbarf ploxx\n", "baz"]
    stream = DataStream.from_iterable(data, max_parallel=4)
    result = await stream.flatmap(lambda s: s.split()).to_list()
    print('result:', result)
    assert result == ['foo', 'bar', 'cork', 'qux', 'barf', 'ploxx', 'baz']

@pytest.mark.asyncio
async def test_flattening_strings():
    data = ["a", "flatmap"]
    stream = DataStream.from_iterable(data, max_parallel=4)
    result = await stream.flatmap(lambda s: s).to_list()
    print('result:', result)
    assert result == ['a', 'f', 'l', 'a', 't', 'm', 'a', 'p']

@pytest.mark.asyncio
async def test_empty_iterables():
    data = [1, 2, 3, 4]
    stream = DataStream.from_iterable(data, max_parallel=4)
    result = await stream.flatmap(lambda x: []).to_list()
    print('result:', result)
    assert result == []

@pytest.mark.asyncio
async def test_flattening_non_iterables_errors():
    data = [1, 2, 3, 4]
    DataStream.from_iterable(data).flatmap(lambda x: x)
    # find flatmap task and see if it errored as expected
    for task in asyncio.all_tasks():
        if task.get_name() == 'flatmap-consumer':
            with pytest.raises(TypeError):
                await task
