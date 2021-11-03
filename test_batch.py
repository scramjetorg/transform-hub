from datastream import DataStream
import asyncio
import pyfca
import utils
from ansi_color_codes import *

log = utils.LogWithTimer.log
fmt = utils.print_formatted

async def test_batching_conditionally():
    data = ["foo", "bar.", "baz", "qux", "plox."]
    stream = DataStream.from_iterable(data, max_parallel=4)
    results = await stream.batch(lambda s: s[-1] == '.').to_list()
    print(results)
    assert results == [['foo', 'bar.'], ['baz', 'qux', 'plox.']]


async def test_batching_with_partial_batch_on_end():
    data = ["foo", "bar.", "baz", "qux", ".", "plox"]
    stream = DataStream.from_iterable(data, max_parallel=4)
    results = await stream.batch(lambda s: s[-1] == '.').to_list()
    print(results)
    assert results == [['foo', 'bar.'], ['baz', 'qux', '.'], ['plox']]

async def test_batching_by_amount():
    data = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    context = {'count': 0}
    def is_nth(chunk, ctx, N):
        ctx['count'] = ctx['count'] + 1
        return ctx['count']% N == 0
    stream = DataStream.from_iterable(data, max_parallel=4)
    results = await stream.batch(is_nth, context, 3).to_list()
    print(results)
    assert results == [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h']]


tests_to_run = [
    test_batching_conditionally,
    test_batching_with_partial_batch_on_end,
    test_batching_by_amount,
]

for test in tests_to_run:
    print(f"\n\nRunning {strong}{test.__name__}{reset}:\n")
    asyncio.run(test())
    utils.LogWithTimer.reset()

