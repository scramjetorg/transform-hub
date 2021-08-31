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

def log_drain_status(drain, item):
    log(f'Drain status: {blue}{drain.done()}{reset} '
        f'{grey}(last write: {utils.chunk_id_or_value(item)}){reset}')

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

def identity(x):
    log(f'{yellow}identity:{reset} {x}')
    return x

async def async_identity(x):
    log(f'{yellow}identity start:{reset} {x}')
    await mock_delay(x)
    log(f'{yellow}identity end:{reset} -> {x}')
    return x

def transform_dict_or_num(description, data, function):
    if type(data) is dict and 'value' in data:
        data['value'] = function(data['value'])
        result = data
    else:
        result = function(data)
    log(f'{yellow}{description}:{reset} -> {result}')
    return result

def increment(x):
    return transform_dict_or_num('increment', x, lambda x: x+1)

async def async_increment(x):
    await mock_delay(x)
    return increment(x)

def double(x):
    return transform_dict_or_num('double', x, lambda x: x*2)

async def async_double(x):
    await mock_delay(x)
    return double(x)

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
MAX_PARALLEL = 4

async def test_write_then_read_concurrently(input_data):
    p = pyfca.Pyfca(MAX_PARALLEL, async_identity)
    for x in input_data:
        p.write(x)
    reads = [p.read() for _ in input_data]
    results = await asyncio.gather(*reads)
    log_results(results)
    assert results == input_data

async def test_write_then_read_sequentially(input_data):
    p = pyfca.Pyfca(MAX_PARALLEL, async_identity)
    for x in input_data:
        p.write(x)
    results = [await p.read() for _ in input_data]
    log_results(results)
    assert results == input_data

async def test_write_and_read_in_turn(input_data):
    p = pyfca.Pyfca(MAX_PARALLEL, async_identity)
    reads = []
    for x in input_data:
        p.write(x)
        reads.append(p.read())
    results = await asyncio.gather(*reads)
    log_results(results)
    assert results == input_data

async def test_reads_before_write(input_data):
    p = pyfca.Pyfca(MAX_PARALLEL, async_identity)
    reads = [p.read() for _ in input_data]
    for x in input_data:
        p.write(x)
    results = await asyncio.gather(*reads)
    log_results(results)
    assert results == input_data

async def test_reads_exceeding_writes(input_data):
    p = pyfca.Pyfca(MAX_PARALLEL, async_identity)
    for x in input_data:
        p.write(x)
    reads = [p.read() for _ in input_data + [True]*4]
    p.end()
    results = await asyncio.gather(*reads)
    log_results(results)
    assert results == input_data + [None]*4

async def test_reads_after_end(input_data):
    p = pyfca.Pyfca(MAX_PARALLEL, async_identity)
    for x in input_data:
        p.write(x)
    p.end()
    reads = [p.read() for _ in input_data + [True]*4]
    results = await asyncio.gather(*reads)
    log_results(results)
    assert results == input_data + [None]*4

# TODO: pass one round of actual data - right now we're checking placeholders
async def test_synchronous_writing(input_data):
    loop = asyncio.get_event_loop()
    event_loop_ran = False

    def update_event_loop_status():
        nonlocal event_loop_ran
        event_loop_ran = True

    def check_event_loop(expected):
        log(f'Did event loop run already? {cyan}{event_loop_ran}{reset}')
        assert event_loop_ran == expected

    loop.call_soon(update_event_loop_status)

    p = pyfca.Pyfca(MAX_PARALLEL, identity)

    # Writes up till MAX_PARALLEL-th should resolve immediately
    for x in input_data[:MAX_PARALLEL-1]:
        drain = p.write(x)
        log_drain_status(drain, x)
        assert drain.done() == True
        await drain
        check_event_loop(False)

    # pass control to event loop
    await asyncio.sleep(0)
    check_event_loop(True)

async def read_with_debug(pyfca, live_results=None):
    """Log received result and update result list immediately."""
    result = await pyfca.read()
    log(f'{green}Got result:{reset} {result}')
    if live_results is not None:
        live_results.append(result)
    return result

async def test_limit_waiting_until_items_are_processed(input_data):
    loop = asyncio.get_event_loop()
    p = pyfca.Pyfca(MAX_PARALLEL, async_identity)

    results = []
    reads = [read_with_debug(p, results) for _ in input_data]
    read_futures = asyncio.gather(*reads)

    def check_results(expected_len):
        assert len(results) >= expected_len

    for items_written, x in enumerate(input_data, start=1):
        drain = p.write(x)
        await drain
        log_drain_status(drain, x)
        expected_results = items_written - MAX_PARALLEL + 1
        log(f'Drain after {items_written} items written, '
            f'at least {expected_results} results should be ready')
        # wait one event loop iteration so that appropriate read is evaluated
        loop.call_soon(check_results, expected_results)

    await read_futures
    log('Results:'); pprint(results)
    assert results == input_data

async def test_limit_waiting_for_reads(input_data):
    p = pyfca.Pyfca(MAX_PARALLEL, async_identity)

    for x in input_data[:MAX_PARALLEL-1]:
        drain = p.write(x)
        await drain
        log_drain_status(drain, x)

    def check_drain(expected):
        log_drain_status(drain, next_item)
        assert drain.done() == expected

    next_item = input_data[MAX_PARALLEL-1]
    drain = p.write(next_item)
    check_drain(False)

    # Wait until all items are processed (we need to first ensure that
    # last_chunk_status is up-to-date).
    await asyncio.sleep(0)
    await p.last_chunk_status

    # We should still not be drained because there were no reads yet.
    check_drain(False)

    first_result = await read_with_debug(p)
    # Drain status should update after next run of event loop
    await asyncio.sleep(0)
    check_drain(True)



async def test_multitransform(input_data):
    p = pyfca.Pyfca(MAX_PARALLEL, async_identity)
    p.add_transform(async_double)
    p.add_transform(async_increment)
    for x in input_data:
        p.write(x)
    reads = [p.read() for _ in input_data]
    results = await asyncio.gather(*reads)
    log('Results:'); pprint(results)
    # remove debug information
    for r in results:
        if '_pyfca_status' in r:
             del r['_pyfca_status']
    assert results == [
        {'id': 0, 'value': 3},
        {'id': 1, 'value': 5},
        {'id': 2, 'value': 3},
        {'id': 3, 'value': 7},
        {'id': 4, 'value': 5},
        {'id': 5, 'value': 9},
    ]

async def test_sync_chain(input_data):
    p = pyfca.Pyfca(MAX_PARALLEL, increment)
    p.add_transform(double)
    for x in input_data:
        p.write(x)
    reads = [p.read() for _ in input_data]
    results = await asyncio.gather(*reads)
    log('Results:'); pprint(results)
    # remove debug information
    for r in results:
        if '_pyfca_status' in r:
             del r['_pyfca_status']
    assert results == [
        {'id': 0, 'value': 4},
        {'id': 1, 'value': 6},
        {'id': 2, 'value': 4},
        {'id': 3, 'value': 8},
        {'id': 4, 'value': 6},
        {'id': 5, 'value': 10},
    ]


# Main test execution loop

tests_to_run = [
    (test_write_then_read_concurrently,            objects_with_values),
    (test_write_then_read_sequentially,            objects_with_values),
    (test_write_and_read_in_turn,                  objects_with_values),
    (test_reads_before_write,                      objects_with_values),
    (test_reads_exceeding_writes,                  objects_with_values),
    (test_reads_after_end,                         objects_with_values),
    (test_synchronous_writing,                     objects_with_values),
    (test_limit_waiting_until_items_are_processed, objects_with_delays),
    (test_limit_waiting_for_reads,                 objects_with_values),
    (test_multitransform,                          objects_with_values),
    (test_sync_chain,                              objects_with_values),
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
