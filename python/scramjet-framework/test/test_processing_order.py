#!/bin/env python3

import asyncio
from pprint import pprint
import pytest

from scramjet import pyfca
import scramjet.utils as utils
from scramjet.ansi_color_codes import *

log = utils.LogWithTimer.log
fmt = utils.print_formatted

# Use to change delays mocking async function execution
SLOMO_FACTOR = 0.2

MAX_PARALLEL = 4

# every second item gets a 'delay' value to mimic long async operations
def make_sequence(count):
    result = [{'id': n, 'value': n} for n in range(count)]
    for item in result:
        if item['id'] % 2:
            item['delay'] = 0.1
    return result


# for checking the order in which transformation functions will be called
function_calls = []

async def increment(chunk):
    function_calls.append(('increment', chunk['id']))
    if 'delay' in chunk:
        await asyncio.sleep(chunk['delay'] * SLOMO_FACTOR)
    chunk['value'] = chunk['value'] + 1
    return chunk

def double(chunk):
    function_calls.append(('double', chunk['id']))
    chunk['value'] = chunk['value'] * 2
    return chunk

def square(chunk):
    function_calls.append(('square', chunk['id']))
    chunk['value'] = chunk['value'] ** 2
    return chunk


@pytest.mark.asyncio
async def test_processing_order_without_waiting():
    input_data = make_sequence(6)
    function_calls.clear()
    utils.LogWithTimer.reset()
    p = pyfca.Pyfca(MAX_PARALLEL)
    p.add_transform(increment)
    p.add_transform(square)
    p.add_transform(double)

    for i, x in enumerate(input_data, start=1):
        drain = p.write(x)
        assert drain.done() == (True if i < MAX_PARALLEL else False)

    reads = [p.read() for _ in input_data]
    results = await asyncio.gather(*reads)
    pprint(results)
    check_order(results)
    incr_order, dbl_order, sqr_order = extract_ordering(function_calls)

    # first transformation function should be called in the same order as input
    assert incr_order == [0, 1, 2, 3, 4, 5]
    # 2nd and 3rd functions should be called first on items with even id (as
    # they are processed by first function immediately)
    assert dbl_order == sqr_order == [0, 2, 4, 1, 3, 5]
    assert function_calls == [
        ('increment', 0),
        ('square', 0),
        ('double', 0),
        ('increment', 1),
        ('increment', 2),
        ('square', 2),
        ('double', 2),
        ('increment', 3),
        ('increment', 4),
        ('square', 4),
        ('double', 4),
        ('increment', 5),
        ('square', 1),
        ('double', 1),
        ('square', 3),
        ('double', 3),
        ('square', 5),
        ('double', 5),
    ]


@pytest.mark.asyncio
async def test_processing_order_with_waiting():
    input_data = make_sequence(9)
    function_calls.clear()
    utils.LogWithTimer.reset()
    p = pyfca.Pyfca(MAX_PARALLEL)
    p.add_transform(increment)
    p.add_transform(square)
    p.add_transform(double)

    reads = [p.read() for _ in input_data]
    for x in input_data:
        await p.write(x)

    results = await asyncio.gather(*reads)
    pprint(results)
    check_order(results)
    incr_order, dbl_order, sqr_order = extract_ordering(function_calls)

    # first transformation function should be called in the same order as input
    assert incr_order == [0, 1, 2, 3, 4, 5, 6, 7, 8]
    # 2nd and 3rd functions should be called first on items with even id (as
    # they are processed by first function immediately) and then with odd id,
    # in batches of 4. Note that 0th element returns immediately so the first
    # "batch" starts at 1.
    assert dbl_order == sqr_order == [0, 2, 4, 1, 3, 6, 8, 5, 7]
    assert function_calls == [
        ('increment', 0),
        ('square', 0),
        ('double', 0),
        ('increment', 1),
        ('increment', 2),
        ('square', 2),
        ('double', 2),
        ('increment', 3),
        ('increment', 4),
        ('square', 4),
        ('double', 4),
        ('square', 1),
        ('double', 1),
        ('square', 3),
        ('double', 3),
        ('increment', 5),
        ('increment', 6),
        ('square', 6),
        ('double', 6),
        ('increment', 7),
        ('increment', 8),
        ('square', 8),
        ('double', 8),
        ('square', 5),
        ('double', 5),
        ('square', 7),
        ('double', 7),
    ]


def check_order(results):
    output_order = [item['id'] for item in results]
    print('Order of output items:', output_order)
    assert output_order == list(range(len(results)))

def extract_ordering(fcalls):
    incrementing_order = [id for fname, id in fcalls if fname == 'increment']
    doubling_order = [id for fname, id in fcalls if fname == 'double']
    squaring_order = [id for fname, id in fcalls if fname == 'square']
    print('Order of "increment" calls:', incrementing_order)
    print('Order of "double" calls:', doubling_order)
    print('Order of "square" calls:', squaring_order)
    return incrementing_order, doubling_order, squaring_order
