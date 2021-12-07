from scramjet.streams import Stream, StreamAlreadyConsumed
import pytest

@pytest.mark.asyncio
async def test_reading_from_one_stream_twice():
    s = Stream.read_from([1, 2, 3, 4])
    await s.to_list()
    with pytest.raises(StreamAlreadyConsumed):
        await s.to_list()

@pytest.mark.asyncio
async def test_transforming_one_stream_twice():
    s1 = Stream.read_from([1, 2, 3, 4])
    s1.map(lambda x: x+1)
    with pytest.raises(StreamAlreadyConsumed):
        s1.map(lambda x: x*2)
