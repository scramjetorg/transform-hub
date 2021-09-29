from datastream import DataStream
from pyfca import omit_chunk
import asyncio
from ansi_color_codes import *

# transformations

async def async_is_even(x):
    await asyncio.sleep((x%5)/10)
    return x % 2 == 0

async def async_square(x):
    await asyncio.sleep((x%5)/10)
    return x**2

def filtering_map(x):
    # map and filter elements in one step
    return omit_chunk if x % 3 == 0 else x*2


# test cases

async def test_simple_filtering():
    stream = DataStream.from_iterable(range(12))
    result = await stream.filter(lambda x: x % 2 == 0).to_list()
    print(result)
    assert result == [0, 2, 4, 6, 8, 10]

async def test_simple_mapping():
    stream = DataStream.from_iterable(range(8))
    result = await stream.map(lambda x: x**2).to_list()
    assert result == [0, 1, 4, 9, 16, 25, 36, 49]

async def test_sync_transformations():
    result = await (
        DataStream
            .from_iterable(range(12), max_parallel=4)
            .filter(lambda x: x % 2 == 0)
            .map(lambda x: x**2)
            .to_list()
    )
    assert result == [0, 4, 16, 36, 64, 100]

async def test_async_transformations():
    result = await (
        DataStream
            .from_iterable(range(12), max_parallel=4)
            .filter(async_is_even)
            .map(async_square)
            .to_list()
    )
    assert result == [0, 4, 16, 36, 64, 100]

# Stream should not start consuming input until a "sink" metod (e.g. to_list)
# is used (to avoid processing items before all transformations are added).
async def test_adding_transformations_after_a_pause():
    result = DataStream.from_iterable(range(12), max_parallel=4)
    # Let event loop run several times, to ensure that any writes to pyfca
    # if they were sheduled) had a chance to run.
    for _ in range(8):
        await asyncio.sleep(0)
    # Stream should not be consumed before transformations are added.
    result = await result.filter(async_is_even).map(async_square).to_list()
    assert result == [0, 4, 16, 36, 64, 100]

async def test_filter_creates_new_stream_instance():
    stream = DataStream.from_iterable(range(12), max_parallel=4)
    filtered = stream.filter(lambda x: x % 2 == 0)
    assert filtered != stream
    assert await filtered.to_list() == [0, 2, 4, 6, 8, 10]

async def test_map_creates_new_stream_instance():
    stream = DataStream.from_iterable(range(8), max_parallel=4)
    mapped = stream.map(lambda x: x**2)
    assert mapped != stream
    assert await mapped.to_list() == [0, 1, 4, 9, 16, 25, 36, 49]

async def test_filtering_in_map_transformation():
    stream = DataStream.from_iterable(range(8), max_parallel=4)
    # It should be possible to do filteing and mapping in one step.
    result = await stream.map(filtering_map).to_list()
    assert result == [2, 4, 8, 10, 14]

async def test_variadic_args():
    stream = DataStream.from_iterable(range(8))
    # pow requires 2 arguments - base (chunk) and exponent (set to 2)
    result = await stream.map(pow, 2).to_list()
    assert result == [0, 1, 4, 9, 16, 25, 36, 49]


# Main test execution loop

tests_to_run = [
    test_simple_filtering,
    test_simple_mapping,
    test_sync_transformations,
    test_async_transformations,
    test_adding_transformations_after_a_pause,
    test_filter_creates_new_stream_instance,
    test_map_creates_new_stream_instance,
    test_filtering_in_map_transformation,
    test_variadic_args,
]

for test in tests_to_run:
    print(f"\n\nRunning {strong}{test.__name__}{reset}:\n")
    asyncio.run(test())
