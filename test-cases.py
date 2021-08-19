#!/bin/env python3

import pyfca
import asyncio
from pprint import pprint as pp

# Use to change delays mocking async function execution
SLOMO_FACTOR = 1


# Transformation functions

async def identity_with_proportional_delay(x):
    print(f'start computing: {x}')
    await asyncio.sleep(x*SLOMO_FACTOR)
    result = x
    print(f'end computing: {x} -> {result}')
    return result


# Test cases

TEST_SEQUENCE = [2,1,3,2]

async def test_write_then_read_concurrently():
    p = pyfca.Pyfca(identity_with_proportional_delay)
    for x in TEST_SEQUENCE:
        p.write(x)
    reads = [p.read(), p.read(), p.read(), p.read()]
    results = await asyncio.gather(*reads)
    print(f'Results: {results}')

async def test_write_then_read_sequentially():
    p = pyfca.Pyfca(identity_with_proportional_delay)
    for x in TEST_SEQUENCE:
        p.write(x)
    results = []
    for _ in range(len(TEST_SEQUENCE)):
        result = await p.read()
        results.append(result)
        print('Consumer got:', result)
    print(f'Results: {results}')

async def test_write_and_read_in_turn():
    p = pyfca.Pyfca(identity_with_proportional_delay)
    reads = []
    for x in TEST_SEQUENCE:
        p.write(x)
        reads.append(p.read())
    results = await asyncio.gather(*reads)
    print(f'Results: {results}')

async def test_multiple_reads_before_write():
    p = pyfca.Pyfca(identity_with_proportional_delay)
    reads = []
    for _ in range(len(TEST_SEQUENCE)):
        reads.append(p.read())
    for x in TEST_SEQUENCE:
        p.write(x)
    results = await asyncio.gather(*reads)
    print(f'Results: {results}')

async def test_writes_exceeding_max_parallel():
    pass

async def test_reads_that_wait_with_ones_that_dont():
    pass

async def test_reads_exceeding_max_parallel():
    pass

async def test_reads_exceeding_writes():
    p = pyfca.Pyfca(identity_with_proportional_delay)
    for x in TEST_SEQUENCE:
        p.write(x)
    reads = [p.read(), p.read(), p.read(), p.read(),
             p.read(), p.read(), p.read(), p.read()]
    p.end()
    results = await asyncio.gather(*reads)
    print(f'Results: {results}')

async def test_reads_after_end():
    p = pyfca.Pyfca(identity_with_proportional_delay)
    for x in TEST_SEQUENCE:
        p.write(x)
    p.end()
    reads = [p.read(), p.read(), p.read(), p.read(),
             p.read(), p.read(), p.read(), p.read()]
    results = await asyncio.gather(*reads)
    print(f'Results: {results}')

async def test_reads_from_closed_pyfca():
    pass


# Main test execution loop

tests_to_run = [
    test_reads_exceeding_writes,
    test_reads_after_end,
    test_write_then_read_concurrently,
    test_write_then_read_sequentially,
    test_write_and_read_in_turn,
    test_multiple_reads_before_write,
]

import time
for test in tests_to_run:
    print(f"\n\nRunning {test.__name__}:\n")
    asyncio.run(test())
    time.sleep(1*SLOMO_FACTOR)
