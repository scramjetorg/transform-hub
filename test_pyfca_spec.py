#!/bin/env python3

"""This file contains tests written according to specification from
https://github.com/scramjetorg/scramjet-framework-shared/blob/main/tests/spec/ifca.md"""

import asyncio
import time
import copy

import pyfca
import utils
from ansi_color_codes import *


MAX_PARALLEL = 4
# Use to change delays mocking async function execution
SPEED = 100
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

def prepend_foo(s):
    log(f'{yellow}prepend foo:{reset} {s}')
    return 'foo-' + s

async def async_identity(x):
    log(f'{yellow}identity start:{reset} {x}')
    await utils.mock_delay(x)
    log(f'{yellow}identity end:{reset} -> {x}')
    return x

async def async_keep_even(x):
    await utils.mock_delay(x)
    return x if x % 2 == 0 else pyfca.omit_chunk



# Basic tests
# -----------

async def test_passthrough_by_default():
    input_data = copy.deepcopy(TEST_DATA_2)
    p = pyfca.Pyfca(MAX_PARALLEL)
    for x in input_data:
        p.write(x)
    results = [await p.read() for _ in input_data]
    # Output should match the input exactly (both values and ordering).
    assert results == input_data

async def test_simple_transformation():
    input_data = ['a', 'b', 'c', 'd', 'e', 'f']
    p = pyfca.Pyfca(MAX_PARALLEL, lambda s: 'foo-' + s)
    for x in input_data:
        p.write(x)
    results = [await p.read() for _ in input_data]
    assert results == ['foo-a', 'foo-b', 'foo-c', 'foo-d', 'foo-e', 'foo-f']

async def test_concurrent_processing():
    input_data = copy.deepcopy(TEST_DATA_2)
    processing_times = []
    processing_items = []

    async def transform(x):
        start = time.perf_counter()
        processing_items.append(x)
        log(f'{yellow}start processing:{reset} {x}')
        await utils.mock_delay(x)
        log(f'{yellow}finish processing:{reset} {x}')
        processing_times.append(time.perf_counter() - start)
        return x

    p = pyfca.Pyfca(MAX_PARALLEL, transform)
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
    relative_overhead = 1.10  # at most 10% overhead
    assert total_processing_time < longest_item + absolute_overhead
    assert total_processing_time < longest_item * relative_overhead


# Ordering tests
# --------------

async def test_result_order_with_odd_chunks_delayed():
    input_data = copy.deepcopy(TEST_DATA_1)
    p = pyfca.Pyfca(MAX_PARALLEL, async_identity)
    for x in input_data:
        p.write(x)
    results = [await p.read() for _ in input_data]
    # items should appear in the output unchanged and in the same order
    assert results == input_data

async def test_result_order_with_varying_processing_time():
    input_data = copy.deepcopy(TEST_DATA_2)
    p = pyfca.Pyfca(MAX_PARALLEL, async_identity)
    for x in input_data:
        p.write(x)
    results = [await p.read() for _ in input_data]
    # items should appear in the output unchanged and in the same order
    assert results == input_data

async def test_write_and_read_in_turn():
    input_data = copy.deepcopy(TEST_DATA_2)
    p = pyfca.Pyfca(MAX_PARALLEL, async_identity)
    reads = []
    for x in input_data:
        p.write(x)
        reads.append(p.read())
    results = await asyncio.gather(*reads)
    # items should appear in the output unchanged and in the same order
    assert results == input_data

async def test_multiple_concurrent_reads():
    input_data = copy.deepcopy(TEST_DATA_2)
    p = pyfca.Pyfca(MAX_PARALLEL, async_identity)
    for x in input_data:
        p.write(x)
    reads = [p.read() for _ in input_data]
    results = await asyncio.gather(*reads)
    # items should appear in the output unchanged and in the same order
    assert results == input_data

async def test_reads_before_write():
    input_data = copy.deepcopy(TEST_DATA_2)
    p = pyfca.Pyfca(MAX_PARALLEL, async_identity)
    reads = [p.read() for _ in input_data]
    for x in input_data:
        p.write(x)
    results = await asyncio.gather(*reads)
    # items should appear in the output unchanged and in the same order
    assert results == input_data


# Filtering tests
# ---------------

async def test_support_for_dropping_chunks():
    input_data = list(range(8))
    p = pyfca.Pyfca(MAX_PARALLEL, async_keep_even)
    for x in input_data:
        p.write(x)
    results = [await p.read() for _ in range(4)]
    assert results == [0, 2, 4, 6]

async def test_reads_before_filtering():
    input_data = list(range(8))
    p = pyfca.Pyfca(MAX_PARALLEL, async_keep_even)
    reads = [p.read() for _ in range(4)]
    for x in input_data:
        p.write(x)
    results = await asyncio.gather(*reads)
    assert results == [0, 2, 4, 6]

async def test_dropping_chunks_in_the_middle_of_chain():
    first_func_called = False
    def first(x):
        nonlocal first_func_called
        first_func_called = True
        log(f'{yellow}Got:{reset} {x}, dropping')
        return pyfca.omit_chunk

    second_func_called = False
    def second(x):
        nonlocal second_func_called
        second_func_called = True
        log(f'{yellow}Got:{reset} {x}')
        return x

    input_data = list(range(8))
    p = pyfca.Pyfca(MAX_PARALLEL, first)
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

async def test_unrestricted_writing_below_limit():
    input_data = copy.deepcopy(TEST_DATA_2)[:MAX_PARALLEL-1]
    p = pyfca.Pyfca(MAX_PARALLEL, async_identity)
    for x in input_data:
        drain = p.write(x)
        assert drain.done() == True
    [await p.read() for _ in input_data]

async def test_drain_pending_when_limit_reached():
    input_data = copy.deepcopy(TEST_DATA_2)[:MAX_PARALLEL]
    p = pyfca.Pyfca(MAX_PARALLEL, async_identity)
    writes = [p.write(x) for x in input_data]
    print(writes[-1])
    assert writes[-1].done() == False
    [await p.read() for _ in input_data]

async def test_drain_resolved_when_drops_below_limit():
    input_data = copy.deepcopy(TEST_DATA_2)[:MAX_PARALLEL+2]
    p = pyfca.Pyfca(MAX_PARALLEL, async_identity)
    writes = [p.write(x) for x in input_data]
    for drain in writes[-3:]:
        assert drain.done() == False
    for _ in range(3):
        print(await p.read())
    await asyncio.sleep(0)
    for drain in writes[-3:]:
        assert drain.done() == True
    for _ in range(3):
        print(await p.read())


# Main test execution loop
# ------------------------

tests_to_run = [
    test_passthrough_by_default,
    test_simple_transformation,
    test_concurrent_processing,
    test_result_order_with_odd_chunks_delayed,
    test_result_order_with_varying_processing_time,
    test_write_and_read_in_turn,
    test_multiple_concurrent_reads,
    test_reads_before_write,
    test_support_for_dropping_chunks,
    test_reads_before_filtering,
    test_dropping_chunks_in_the_middle_of_chain,
    test_unrestricted_writing_below_limit,
    test_drain_pending_when_limit_reached,
    test_drain_resolved_when_drops_below_limit,
]

for test in tests_to_run:
    print(f"\n\nRunning {strong}{test.__name__}{reset}:\n")
    asyncio.run(test())
    utils.LogWithTimer.reset()
