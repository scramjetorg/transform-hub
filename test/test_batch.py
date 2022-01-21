from scramjet.streams import Stream
import scramjet.utils as utils
from scramjet.ansi_color_codes import *
import pytest

log = utils.LogWithTimer.log
fmt = utils.print_formatted

@pytest.mark.asyncio
async def test_batching_conditionally():
    data = ["foo", "bar.", "baz", "qux", "plox."]
    stream = Stream.from_iterable(data, max_parallel=4)
    results = await stream.batch(lambda s: s[-1] == '.').to_list()
    assert results == [['foo', 'bar.'], ['baz', 'qux', 'plox.']]

@pytest.mark.asyncio
async def test_batching_with_partial_batch_on_end():
    data = ["foo", "bar.", "baz", "qux", ".", "plox"]
    stream = Stream.from_iterable(data, max_parallel=4)
    results = await stream.batch(lambda s: s[-1] == '.').to_list()
    assert results == [['foo', 'bar.'], ['baz', 'qux', '.'], ['plox']]

@pytest.mark.asyncio
async def test_batching_by_amount():
    data = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    context = {'count': 0}
    def is_nth(chunk, ctx, N):
        ctx['count'] = ctx['count'] + 1
        return ctx['count']% N == 0
    stream = Stream.from_iterable(data, max_parallel=4)
    results = await stream.batch(is_nth, context, 3).to_list()
    assert results == [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h']]
