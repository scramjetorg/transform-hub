from datastream import DataStream
import asyncio
import pyfca
import utils
from ansi_color_codes import *

log = utils.LogWithTimer.log
fmt = utils.print_formatted


async def test_reduce_adding_numbers():
    data = [1, 2, 3, 4, 5, 6]
    stream = DataStream.from_iterable(data)
    result = await stream.reduce(lambda acc, item: acc+item, 0)
    print('sum:', result)
    assert result == 21

async def test_reducing_with_no_initial_value():
    data = [1, 2, 3, 4, 5, 6]
    stream = DataStream.from_iterable(data, max_parallel=4)
    result = await stream.reduce(lambda acc, item: acc+item)
    print('sum:', result)
    assert result == 21

async def test_reducing_numbers_to_string():
    data = [1, 2, 3, 4, 5, 6]
    stream = DataStream.from_iterable(data, max_parallel=4)
    result = await stream.reduce(lambda acc, item: acc+str(item), "")
    print('concatenated:', repr(result))
    assert result == "123456"

async def test_counting_items_with_reduce():
    data = ['a', 'b', 'c', 'd', 'e', 'f']
    stream = DataStream.from_iterable(data, max_parallel=4)
    result = await stream.reduce(lambda count, item: count + 1, 0)
    print('count:', result)
    assert result == 6

async def test_calculating_average_with_reduce():
    data = [1, 3, 5, 7]
    stream = DataStream.from_iterable(data)
    def rolling_avg(accumulator, item):
        partial_sum, count = accumulator
        return (partial_sum + item, count + 1)
    sum, count = await stream.reduce(rolling_avg, (0, 0))
    result = sum/count
    print('average:', result)
    assert result == 4


tests_to_run = [
    test_reduce_adding_numbers,
    test_reducing_with_no_initial_value,
    test_reducing_numbers_to_string,
    test_counting_items_with_reduce,
    test_calculating_average_with_reduce,
]

for test in tests_to_run:
    print(f"\n\nRunning {strong}{test.__name__}{reset}:\n")
    asyncio.run(test())
    utils.LogWithTimer.reset()

