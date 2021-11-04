from datastream import DataStream
import asyncio
import pyfca
import utils
from ansi_color_codes import *
from pprint import pprint

log = utils.LogWithTimer.log
fmt = utils.print_formatted


async def test_flattening_lists():
    data = ["foo\nbar", "cork", "qux\nbarf ploxx\n", "baz"]
    stream = DataStream.from_iterable(data, max_parallel=4)
    result = await stream.flatmap(lambda s: s.split()).to_list()
    print('result:', result)
    assert result == ['foo', 'bar', 'cork', 'qux', 'barf', 'ploxx', 'baz']

async def test_flattening_strings():
    data = ["a", "flatmap"]
    stream = DataStream.from_iterable(data, max_parallel=4)
    result = await stream.flatmap(lambda s: s).to_list()
    print('result:', result)
    assert result == ['a', 'f', 'l', 'a', 't', 'm', 'a', 'p']

async def test_empty_iterables():
    data = [1, 2, 3, 4]
    stream = DataStream.from_iterable(data, max_parallel=4)
    result = await stream.flatmap(lambda x: []).to_list()
    print('result:', result)
    assert result == []

async def test_flattening_non_iterables_errors():
    data = [1, 2, 3, 4]
    stream = DataStream.from_iterable(data, max_parallel=4)

    # catch and check exception from the async task
    def handle_exception(loop, context):
        msg = context.get("exception", context["message"])
        print(f"Caught exception: {repr(msg)}")
        assert isinstance(context['exception'], TypeError)
        assert context["exception"].__str__() == "'int' object is not iterable"
        loop.stop() # this raises RuntimeError, I don't know how to stop it

    loop = asyncio.get_event_loop()
    loop.set_exception_handler(handle_exception)

    await stream.flatmap(lambda x: x).to_list()
    assert False


tests_to_run = [
    test_flattening_lists,
    test_flattening_strings,
    test_empty_iterables,
    test_flattening_non_iterables_errors,
]

for test in tests_to_run:
    print(f"\n\nRunning {strong}{test.__name__}{reset}:\n")
    try:
        asyncio.run(test())
    except RuntimeError:
        pass
    utils.LogWithTimer.reset()
