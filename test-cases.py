#!/bin/env python3

import asyncio
import sys
from pprint import pprint
import random

import pyfca
import utils
from ansi_color_codes import *

log = utils.LogWithTimer.log
fmt = utils.print_formatted
random.seed('Pyfca')

# Use to change delays mocking async function execution
SLOMO_FACTOR = float(sys.argv[1]) if len(sys.argv) > 1 else 1
MAX_DELAY = 3


# Transformation functions and utilities

def log_results(results):
    log('Results:')
    pprint(results)

async def mock_delay(data):
    """Pretend that we run some async operations that take some time."""
    delay = 0
    if isinstance(data, object) and hasattr(data, 'delay'):
        delay = data.delay
    elif type(data) is dict:
        if 'delay' in data:
            delay = data['delay']
    elif type(data) is int:
        delay = data
    if not delay:
        delay = random.uniform(0, MAX_DELAY)
    await asyncio.sleep(delay * SLOMO_FACTOR)


async def identity_with_delay(x):
    log(f'{yellow}computing start:{reset} {x}')
    await mock_delay(x)
    log(f'{yellow}computing end:{reset} -> {x}')
    return x


# Test cases

TEST_SEQUENCE = [1,2,1,3,2,4]
objects_with_delays = [
    {'id': count, 'delay': value}
    for count, value
    in enumerate(TEST_SEQUENCE)
]
objects_with_values = [
    {'id': count, 'value': value}
    for count, value
    in enumerate(TEST_SEQUENCE)
]

async def test_write_then_read_concurrently(input_data):
    p = pyfca.Pyfca(identity_with_delay)
    for x in input_data:
        p.write(x)
    reads = [p.read() for _ in input_data]
    results = await asyncio.gather(*reads)
    log_results(results)
    assert results == input_data

async def test_write_then_read_sequentially(input_data):
    p = pyfca.Pyfca(identity_with_delay)
    for x in input_data:
        p.write(x)
    results = [await p.read() for _ in input_data]
    log_results(results)
    assert results == input_data

async def test_write_and_read_in_turn(input_data):
    p = pyfca.Pyfca(identity_with_delay)
    reads = []
    for x in input_data:
        p.write(x)
        reads.append(p.read())
    results = await asyncio.gather(*reads)
    log_results(results)
    assert results == input_data

async def test_reads_before_write(input_data):
    p = pyfca.Pyfca(identity_with_delay)
    reads = [p.read() for _ in input_data]
    for x in input_data:
        p.write(x)
    results = await asyncio.gather(*reads)
    log_results(results)
    assert results == input_data

async def test_reads_exceeding_writes(input_data):
    p = pyfca.Pyfca(identity_with_delay)
    for x in input_data:
        p.write(x)
    reads = [p.read() for _ in input_data + [True]*4]
    p.end()
    results = await asyncio.gather(*reads)
    log_results(results)
    assert results == input_data + [None]*4

async def test_reads_after_end(input_data):
    p = pyfca.Pyfca(identity_with_delay)
    for x in input_data:
        p.write(x)
    p.end()
    reads = [p.read() for _ in input_data + [True]*4]
    results = await asyncio.gather(*reads)
    log_results(results)
    assert results == input_data + [None]*4


# Main test execution loop

tests_to_run = [
    (test_write_then_read_concurrently,            objects_with_values),
    (test_write_then_read_sequentially,            objects_with_values),
    (test_write_and_read_in_turn,                  objects_with_values),
    (test_reads_before_write,                      objects_with_values),
    (test_reads_exceeding_writes,                  objects_with_values),
    (test_reads_after_end,                         objects_with_values),
]

import time
import copy
for test, data in tests_to_run:
    print(f"\n\nRunning {strong}{test.__name__}{reset}:\n")
    # make sure we use fresh copy of data for each test
    input_data = copy.deepcopy(data)
    asyncio.run(test(input_data))
    time.sleep(1*SLOMO_FACTOR)
    utils.LogWithTimer.reset()
