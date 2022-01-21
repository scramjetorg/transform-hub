from scramjet.streams import Stream
import scramjet.utils as utils
from scramjet.ansi_color_codes import *
import pytest

log = utils.LogWithTimer.log
fmt = utils.print_formatted

@pytest.mark.asyncio
async def test_reduce_adding_numbers():
    data = [1, 2, 3, 4, 5, 6]
    stream = Stream.from_iterable(data)
    result = await stream.reduce(lambda acc, item: acc+item, 0)
    print('sum:', result)
    assert result == 21

@pytest.mark.asyncio
async def test_reducing_with_no_initial_value():
    data = [1, 2, 3, 4, 5, 6]
    stream = Stream.from_iterable(data, max_parallel=4)
    result = await stream.reduce(lambda acc, item: acc+item)
    print('sum:', result)
    assert result == 21

@pytest.mark.asyncio
async def test_reducing_numbers_to_string():
    data = [1, 2, 3, 4, 5, 6]
    stream = Stream.from_iterable(data, max_parallel=4)
    result = await stream.reduce(lambda acc, item: acc+str(item), "")
    print('concatenated:', repr(result))
    assert result == "123456"

@pytest.mark.asyncio
async def test_counting_items_with_reduce():
    data = ['a', 'b', 'c', 'd', 'e', 'f']
    stream = Stream.from_iterable(data, max_parallel=4)
    result = await stream.reduce(lambda count, item: count + 1, 0)
    print('count:', result)
    assert result == 6

@pytest.mark.asyncio
async def test_calculating_average_with_reduce():
    data = [1, 3, 5, 7]
    stream = Stream.from_iterable(data)
    def rolling_avg(accumulator, item):
        partial_sum, count = accumulator
        return (partial_sum + item, count + 1)
    sum, count = await stream.reduce(rolling_avg, (0, 0))
    result = sum/count
    print('average:', result)
    assert result == 4
