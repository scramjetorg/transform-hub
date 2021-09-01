#!/bin/env python3

import asyncio
import sys
from pprint import pprint

import pyfca
import utils
from ansi_color_codes import *

log = utils.LogWithTimer.log
fmt = utils.print_formatted

# Use to change delays mocking async function execution
SLOMO_FACTOR = float(sys.argv[1]) if len(sys.argv) > 1 else 1


# Transformation functions and utilities

x, y, z = 0, 0, 0

async def async_add_x(chunk):
    global x
    chunk['x'] = x
    chunk['n'] = chunk['id'] % 2
    x += 1
    if chunk['id'] % 2:
        await asyncio.sleep(SLOMO_FACTOR)
    return chunk

def add_y(chunk):
    log(f'{yellow}sync transform{reset} on {fmt(chunk)}')
    global y
    chunk['y'] = y
    y += 1
    return chunk

def add_z(chunk):
    global z
    chunk['z'] = z
    z += 1
    return chunk

# Test cases

n = 6
test_data = [{'id': n} for n in range(n)]
MAX_PARALLEL = 4

async def PTS(input_data):
    p = pyfca.Pyfca(MAX_PARALLEL, async_add_x)
    p.add_transform(add_y)
    p.add_transform(add_z)

    def write_next():
        return p.write(input_data.pop(0))

    for _ in range(MAX_PARALLEL - 1):
        assert write_next().done() == True
    for _ in range(n - MAX_PARALLEL + 1):
        assert write_next().done() == False

    reads = [p.read() for _ in range(n)]
    results = await asyncio.gather(*reads)

    pprint(results)
    for r in results:
        assert r['y'] == r['z']
    results.sort(key=lambda r: r['y'])
    processing_order = [r['id'] for r in results]
    assert processing_order == [0, 2, 4, 1, 3, 5]


# Main test execution loop

print(f"\n\nRunning {strong}{PTS.__name__}{reset}:\n")
asyncio.run(PTS(test_data))

