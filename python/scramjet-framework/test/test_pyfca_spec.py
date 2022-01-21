#!/bin/env python3

"""This file contains tests written according to specification from
https://github.com/scramjetorg/scramjet-framework-shared/blob/main/tests/spec/ifca.md"""

import asyncio
import time
import copy
import pytest

from scramjet import pyfca
import scramjet.utils as utils
from scramjet.ansi_color_codes import *


MAX_PARALLEL = 4
# Use to change delays mocking async function execution
SPEED = 200
log = utils.LogWithTimer.log

# Input data

TEST_DATA_1 = [
    {'id': x, 'delay': (x % 2)/SPEED} for x in range(6)
]

TEST_SEQUENCE = [1, 3, 2, 6, 4, 5]

TEST_DATA_2 = [
    {'id': count, 'value': value, 'delay': value/SPEED}
    for count, value
    in enumerate(TEST_SEQUENCE)
]


# Transformation functions and utilities

async def async_identity(x):
    log(f'{yellow}identity start:{reset} {x}')
    await utils.mock_delay(x)
    log(f'{yellow}identity end:{reset} -> {x}')
    return x

async def async_keep_even(x):
    await utils.mock_delay(x)
    if x % 2 == 0:
        log(f'{yellow}keep even:{reset} {x} -> {x}')
        return x
    else:
        log(f'{yellow}keep even:{reset} {x} -> drop')
        return pyfca.DropChunk



# Basic tests
# -----------

@pytest.mark.asyncio
async def test_passthrough_by_default():
    input_data = copy.deepcopy(TEST_DATA_2)
    p = pyfca.Pyfca(MAX_PARALLEL)
    for x in input_data:
        p.write(x)
    results = [await p.read() for _ in input_data]
    for x in results:
        log(f"Got: {x}")
    # Output should match the input exactly (both values and ordering).
    assert results == input_data

@pytest.mark.asyncio
async def test_simple_transformation():
    input_data = ['a', 'b', 'c', 'd', 'e', 'f']
    p = pyfca.Pyfca(MAX_PARALLEL)
    p.add_transform(lambda s: 'foo-' + s)
    for x in input_data:
        p.write(x)
    results = [await p.read() for _ in input_data]
    for x in results:
        log(f"Got: {x}")
    assert results == ['foo-a', 'foo-b', 'foo-c', 'foo-d', 'foo-e', 'foo-f']

@pytest.mark.asyncio
async def test_concurrent_processing():
    input_data = copy.deepcopy(TEST_DATA_2)
    processing_times = []
    processing_items = []

    async def transform(x):
        start = time.perf_counter()
        processing_items.append(x)
        log(f'{yellow}processing start:{reset} {x}')
        await utils.mock_delay(x)
        log(f'{yellow}processing end:{reset} {x}')
        processing_times.append(time.perf_counter() - start)
        return x

    p = pyfca.Pyfca(MAX_PARALLEL)
    p.add_transform(transform)
    start = time.perf_counter()
    for x in input_data:
        p.write(x)

    # let one event loop iteration run
    await asyncio.sleep(0)
    for item in input_data:
        assert item in processing_items

    for _ in input_data:
        await p.read()

    total_processing_time = time.perf_counter() - start
    assert total_processing_time < sum(processing_times)

    longest_item = max(processing_times)
    absolute_overhead = 0.02  # at most 20ms overhead
    relative_overhead = 1.20  # at most 20% overhead
    assert total_processing_time < longest_item + absolute_overhead
    assert total_processing_time < longest_item * relative_overhead


# Ordering tests
# --------------

@pytest.mark.asyncio
async def test_result_order_with_odd_chunks_delayed():
    input_data = copy.deepcopy(TEST_DATA_1)
    p = pyfca.Pyfca(MAX_PARALLEL)
    p.add_transform(async_identity)
    for x in input_data:
        p.write(x)
    results = [await p.read() for _ in input_data]
    # items should appear in the output unchanged and in the same order
    assert results == input_data

@pytest.mark.asyncio
async def test_result_order_with_varying_processing_time():
    input_data = copy.deepcopy(TEST_DATA_2)
    p = pyfca.Pyfca(MAX_PARALLEL)
    p.add_transform(async_identity)
    for x in input_data:
        p.write(x)
    results = [await p.read() for _ in input_data]
    # items should appear in the output unchanged and in the same order
    assert results == input_data

@pytest.mark.asyncio
async def test_write_and_read_in_turn():
    input_data = copy.deepcopy(TEST_DATA_2)
    p = pyfca.Pyfca(MAX_PARALLEL)
    p.add_transform(async_identity)
    reads = []
    for x in input_data:
        p.write(x)
        reads.append(p.read())
    results = await asyncio.gather(*reads)
    # items should appear in the output unchanged and in the same order
    assert results == input_data

@pytest.mark.asyncio
async def test_multiple_concurrent_reads():
    input_data = copy.deepcopy(TEST_DATA_2)
    p = pyfca.Pyfca(MAX_PARALLEL)
    p.add_transform(async_identity)
    for x in input_data:
        p.write(x)
    reads = [p.read() for _ in input_data]
    results = await asyncio.gather(*reads)
    # items should appear in the output unchanged and in the same order
    assert results == input_data

@pytest.mark.asyncio
async def test_reads_before_write():
    input_data = copy.deepcopy(TEST_DATA_2)
    p = pyfca.Pyfca(MAX_PARALLEL)
    p.add_transform(async_identity)
    reads = [p.read() for _ in input_data]
    for x in input_data:
        p.write(x)
    results = await asyncio.gather(*reads)
    # items should appear in the output unchanged and in the same order
    assert results == input_data


# Filtering tests
# ---------------

@pytest.mark.asyncio
async def test_support_for_dropping_chunks():
    input_data = list(range(8))
    p = pyfca.Pyfca(MAX_PARALLEL)
    p.add_transform(async_keep_even)
    for x in input_data:
        p.write(x)
    results = [await p.read() for _ in range(4)]
    assert results == [0, 2, 4, 6]

@pytest.mark.asyncio
async def test_reads_before_filtering():
    input_data = list(range(8))
    p = pyfca.Pyfca(MAX_PARALLEL)
    p.add_transform(async_keep_even)
    reads = [p.read() for _ in range(4)]
    for x in input_data:
        p.write(x)
    results = await asyncio.gather(*reads)
    assert results == [0, 2, 4, 6]

@pytest.mark.asyncio
async def test_dropping_chunks_in_the_middle_of_chain():
    first_func_called = False
    def first(x):
        nonlocal first_func_called
        first_func_called = True
        log(f'{yellow}drop all:{reset} {x} -> drop')
        return pyfca.DropChunk

    second_func_called = False
    def second(x):
        nonlocal second_func_called
        second_func_called = True
        log(f'{yellow}never called:{reset} {x}')
        return x

    input_data = list(range(8))
    p = pyfca.Pyfca(MAX_PARALLEL)
    p.add_transform(first)
    p.add_transform(second)
    for x in input_data:
        p.write(x)

    # Ensure all items were processed
    p.end()
    await p.read()

    assert first_func_called == True
    assert second_func_called == False


# Limits tests
# ------------

@pytest.mark.asyncio
async def test_unrestricted_writing_below_limit():
    input_data = copy.deepcopy(TEST_DATA_2)[:MAX_PARALLEL-1]
    p = pyfca.Pyfca(MAX_PARALLEL)
    p.add_transform(async_identity)
    for x in input_data:
        drain = p.write(x)
        assert drain.done() == True
    [await p.read() for _ in input_data]

@pytest.mark.asyncio
async def test_drain_pending_when_limit_reached():
    input_data = copy.deepcopy(TEST_DATA_2)[:MAX_PARALLEL]
    p = pyfca.Pyfca(MAX_PARALLEL)
    p.add_transform(async_identity)
    writes = [p.write(x) for x in input_data]
    assert writes[-1].done() == False
    [await p.read() for _ in input_data]

@pytest.mark.asyncio
async def test_drain_resolved_when_drops_below_limit():
    input_data = copy.deepcopy(TEST_DATA_2)[:MAX_PARALLEL+2]
    p = pyfca.Pyfca(MAX_PARALLEL)
    p.add_transform(async_identity)
    writes = [p.write(x) for x in input_data]
    for drain in writes[-3:]:
        assert drain.done() == False
    for _ in range(3):
        await p.read()
    await asyncio.sleep(0)
    for drain in writes[-3:]:
        assert drain.done() == True
    for _ in range(3):
        await p.read()


# Ending tests
# ------------

@pytest.mark.asyncio
async def test_reading_from_empty_ifca():
    p = pyfca.Pyfca(MAX_PARALLEL)
    p.end()
    result = await p.read()
    log(f"Got: {result}")
    assert result == None

@pytest.mark.asyncio
async def test_end_with_pending_reads():
    N = MAX_PARALLEL*2
    p = pyfca.Pyfca(MAX_PARALLEL)
    reads = [p.read() for _ in range(N)]
    p.end()
    results = await asyncio.gather(*reads)
    log(f"Got: {results}")
    assert results == [None] * N

@pytest.mark.asyncio
async def test_write_after_end_errors():
    p = pyfca.Pyfca(MAX_PARALLEL)
    p.end()
    with pytest.raises(pyfca.WriteAfterEnd):
        p.write('foo')

@pytest.mark.asyncio
async def test_multiple_ends_error():
    p = pyfca.Pyfca(MAX_PARALLEL)
    p.end()
    with pytest.raises(pyfca.MultipleEnd):
        p.end()
