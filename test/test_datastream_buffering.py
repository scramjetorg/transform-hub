from scramjet.datastream import DataStream
from scramjet.ansi_color_codes import *
import scramjet.utils as utils
import pytest

log = utils.LogWithTimer.log

async def echo(x):
    log(f"{yellow}Processing:{reset} {repr(x)}")
    return x

# test cases

@pytest.mark.asyncio
async def test_reading_and_writing_to_file():
    with open('test/sample_text_1.txt') as file:
        await DataStream.read_from(file).map(lambda s: s.encode()).to_file('test_output')
    with open('test/sample_text_1.txt') as source, open('test_output') as dest:
        assert source.read() == dest.read()
