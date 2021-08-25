#!/bin/env python3

import asyncio
import sys
from pprint import pprint
import pyfca

# Use to change delays mocking async function execution
SLOMO_FACTOR = float(sys.argv[1]) if len(sys.argv) > 1 else 1


# Transformation functions and utilities

async def mock_delay(data):
    """Pretend that we run some async operations that take some time."""
    if isinstance(data, object) and hasattr(data, 'delay'):
        delay = data.delay
    elif type(data) is int:
        delay = data
    else:
        delay = 1
    await asyncio.sleep(delay * SLOMO_FACTOR)

async def identity_with_delay(x):
    print(f'computing start: {x}')
    await mock_delay(x)
    result = x
    print(f'computing end: {x} -> {result}')
    return result


# Test cases

TEST_SEQUENCE = [2,1,3,2]

async def test_write_then_read_concurrently():
    p = pyfca.Pyfca(identity_with_delay)
    for x in TEST_SEQUENCE:
        p.write(x)
    reads = [p.read() for _ in TEST_SEQUENCE]
    results = await asyncio.gather(*reads)
    print(f'Results: {results}')
    assert results == TEST_SEQUENCE

async def test_write_then_read_sequentially():
    p = pyfca.Pyfca(identity_with_delay)
    for x in TEST_SEQUENCE:
        p.write(x)
    results = [await p.read() for _ in TEST_SEQUENCE]
    print(f'Results: {results}')
    assert results == TEST_SEQUENCE

async def test_write_and_read_in_turn():
    p = pyfca.Pyfca(identity_with_delay)
    reads = []
    for x in TEST_SEQUENCE:
        p.write(x)
        reads.append(p.read())
    results = await asyncio.gather(*reads)
    print(f'Results: {results}')
    assert results == TEST_SEQUENCE

async def test_reads_before_write():
    p = pyfca.Pyfca(identity_with_delay)
    reads = [p.read() for _ in TEST_SEQUENCE]
    for x in TEST_SEQUENCE:
        p.write(x)
    results = await asyncio.gather(*reads)
    print(f'Results: {results}')
    assert results == TEST_SEQUENCE

async def test_reads_exceeding_writes():
    p = pyfca.Pyfca(identity_with_delay)
    for x in TEST_SEQUENCE:
        p.write(x)
    reads = [p.read() for _ in TEST_SEQUENCE + [True]*4]
    p.end()
    results = await asyncio.gather(*reads)
    print(f'Results: {results}')
    assert results == TEST_SEQUENCE + [None]*4

async def test_reads_after_end():
    p = pyfca.Pyfca(identity_with_delay)
    for x in TEST_SEQUENCE:
        p.write(x)
    p.end()
    reads = [p.read() for _ in TEST_SEQUENCE + [True]*4]
    results = await asyncio.gather(*reads)
    print(f'Results: {results}')
    assert results == TEST_SEQUENCE + [None]*4


# Main test execution loop

tests_to_run = [
    test_write_then_read_concurrently,
    test_write_then_read_sequentially,
    test_write_and_read_in_turn,
    test_reads_before_write,
    test_reads_exceeding_writes,
    test_reads_after_end,
]

import time
for test in tests_to_run:
    print(f"\n\nRunning {test.__name__}:\n")
    asyncio.run(test())
    time.sleep(1*SLOMO_FACTOR)
