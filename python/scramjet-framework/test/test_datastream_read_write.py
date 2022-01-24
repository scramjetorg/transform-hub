from scramjet.streams import Stream, StreamAlreadyConsumed
import asyncio
from scramjet.ansi_color_codes import *
import pytest

# test cases

@pytest.mark.asyncio
async def test_writing_chunks_to_stream():
    stream = Stream()
    for x in [1, 2, 3, 4]:
        stream.write(x)
    stream.end()
    assert [1, 2, 3, 4] == await stream.to_list()

@pytest.mark.asyncio
async def test_reading_chunks_from_stream():
    stream = Stream.from_iterable('abcd')
    assert await stream.read() == 'a'
    assert await stream.read() == 'b'
    assert await stream.read() == 'c'
    assert await stream.read() == 'd'

@pytest.mark.asyncio
async def test_reading_from_consumed_stream():
    s1 = Stream.from_iterable('abcd')
    s2 = s1.map(lambda x: x*2)
    with pytest.raises(StreamAlreadyConsumed):
        await s1.read()

@pytest.mark.asyncio
async def test_writing_to_imediate_stream():
    s1 = Stream().map(lambda x: x*2)
    s2 = s1.map(lambda x: "foo-" + x)
    s2.write("a")
    assert await s2.read() == "foo-aa"

@pytest.mark.asyncio
async def test_writing_to_imediate_stream_with_pyfca_break():
    s1 = Stream()
    s2 = s1.batch(lambda chunk: chunk > "d")
    s3 = s2.map(lambda x: len(x))
    s3.write("a")
    s3.write("c")
    s3.write("e")
    s3.write("d")
    s3.write("b")
    s1.end()
    assert await s3.to_list() == [3, 2]

@pytest.mark.asyncio
async def test_reading_some_chunks_from_stream():
    stream = Stream.from_iterable('abcd')
    assert await stream.read() == 'a'
    assert ['b', 'c', 'd'] == await stream.to_list()

@pytest.mark.asyncio
async def test_reading_and_writing_in_turn():
    stream = Stream()
    for x in [1, 2, 3, 4]:
        await stream.write(x)
        assert await stream.read() == x
    stream.end()

@pytest.mark.asyncio
async def test_stream_write_returns_drain_status():
    stream = Stream(max_parallel=4)
    data = [1, 2, 3, 4, 5, 6, 7, 8]
    writes = [stream.write(x) for x in data]
    # initially only writes below max_parallel should resolve drain
    for i, drain in enumerate(writes, 1):
        assert drain.done() == (i<4)
    stream.end()
    result = await stream.to_list()
    assert result == data
    # wait one even loop iteration for drain updates
    await asyncio.sleep(0)
    for drain in writes:
        assert drain.done()
