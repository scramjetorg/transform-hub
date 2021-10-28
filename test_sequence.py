from datastream import DataStream
import asyncio
import pyfca
import utils
from ansi_color_codes import *

log = utils.LogWithTimer.log
fmt = utils.print_formatted

async def test_sequencing_text_into_lines():
    data = ["foo\nbar", " ", "b", "az", "\nqux\n", "plox"]
    result = await (
        DataStream
            .from_iterable(data, max_parallel=2)
            .sequence(lambda part, chunk: (part+chunk).split('\n'), "")
            .to_list()
    )
    print(result)
    assert result == ['foo', 'bar baz', 'qux', 'plox']

# I know, this could be done using flatmap+batch
async def test_sequencing_lists_into_batches():
    data = [[1, 2, 3], [4, 5], [6, 7, 8, 9, 10]]
    def split_into_pairs(part, li):
        new_list = part + li
        every_2nd_index = range(0, len(new_list), 2)
        return [new_list[i:i+2] for i in every_2nd_index]
    result = await (
        DataStream
            .from_iterable(data, max_parallel=2)
            .sequence(split_into_pairs, [])
            .to_list()
    )
    print(result)
    assert result == [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]]

tests_to_run = [
    test_sequencing_text_into_lines,
    test_sequencing_lists_into_batches,
]

for test in tests_to_run:
    print(f"\n\nRunning {strong}{test.__name__}{reset}:\n")
    asyncio.run(test())
    utils.LogWithTimer.reset()

