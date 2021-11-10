#!/bin/env python3

import asyncio
import sys
from pprint import pprint
import random

import pyfca
import utils
from ansi_color_codes import *

log = utils.LogWithTimer.log
random.seed('Pyfca')

# Input data

NUMBER_SEQUENCE = [1, 3, 2, 6, 4, 5]
TEST_DATA = [
    {'id': count, 'delay': value*0.5}
    for count, value
    in enumerate(NUMBER_SEQUENCE)
]

# Transformation functions

async def mock_delay(data):
    delay = data['delay']
    await asyncio.sleep(delay)

async def async_identity(x):
    log(f'{yellow}identity start:{reset} {x}')
    await mock_delay(x)
    log(f'{yellow}identity end:{reset} -> {x}')
    return x

# Processing samples

async def simple_pyfca_example():
    print('Input:'); pprint(TEST_DATA)

    p = pyfca.Pyfca(4, async_identity)
    reads = [p.read() for _ in TEST_DATA]
    for x in TEST_DATA:
        await p.write(x)
    results = await asyncio.gather(*reads)

    print('Results:'); pprint(results)

print(f"\n{strong}Running simple_pyfca_example:{reset}")
asyncio.run(simple_pyfca_example())
