from datastream import DataStream
from multiprocessing import Process
import asyncio
import os
import time
from ansi_color_codes import *
import utils
import pytest

log = utils.LogWithTimer.log

async def echo(x):
    log(f"{yellow}Processing:{reset} {repr(x)}")
    return x

# test cases

@pytest.mark.asyncio
async def test_reading_and_writing_to_file():
    with open('sample_text_1.txt') as file:
        await DataStream.read_from(file).map(lambda s: s.encode()).to_file('test_output')
    with open('sample_text_1.txt') as source, open('test_output') as dest:
        assert source.read() == dest.read()
