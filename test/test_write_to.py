from scramjet.streams import DataStream
import pytest

@pytest.mark.asyncio
async def test_write_to_file():
    with open("test_output", 'w') as file:
        s = DataStream.read_from("abcdef")
        await s.write_to(file)
    with open("test_output") as file:
        assert file.read() == "abcdef"

@pytest.mark.asyncio
async def test_write_to_another_stream():
    s1 = DataStream.read_from(range(8), max_parallel=4).map(lambda x: x+1)
    s2 = DataStream(name="s2", max_parallel=4)
    await s1.write_to(s2)
    s2.end()
    assert await s2.to_list() == [1, 2, 3, 4, 5, 6, 7, 8]
