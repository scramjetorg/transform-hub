from scramjet.streams import Stream, StreamAlreadyConsumed
import asyncio
import pytest

@pytest.mark.asyncio
async def test_simple_stream_piping():
    s1 = Stream.read_from(range(8)).map(lambda x: 2*x)
    s2 = Stream().filter(lambda x: x > 5)
    s1.pipe(s2)
    assert await s2.to_list() == [6, 8, 10, 12, 14]

@pytest.mark.asyncio
async def test_piping_to_multiple_targets():
    source = Stream.read_from(range(8), max_parallel=4).map(lambda x: x+1)
    s1 = Stream(max_parallel=4).map(lambda x: x/10)
    s2 = Stream(max_parallel=4).map(lambda x: x*10)
    source.pipe(s1)
    source.pipe(s2)
    result1, result2 = await asyncio.gather(s1.to_list(), s2.to_list())
    assert result1 == [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]
    assert result2 == [10, 20, 30, 40, 50, 60, 70, 80]

@pytest.mark.asyncio
async def test_piped_stream_cannot_be_transformed():
    s1 = Stream.read_from(range(8)).map(lambda x: 2*x)
    s2 = Stream()
    s1.pipe(s2)
    with pytest.raises(StreamAlreadyConsumed):
        s1.map(lambda x: x+1)
    await s2.to_list()
