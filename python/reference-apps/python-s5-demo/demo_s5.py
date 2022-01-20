import sys
import asyncio
import re
from collections import Counter
from scramjet.streams import Stream


class shared:
    letters = "abc"

class WrongInputError(Exception):
    pass

async def watch_stdin(logger):
    async for data in sys.stdin:
        if letters := data.rstrip():
            shared.letters = letters
            logger.info(f"Letter set changed to {repr(shared.letters)}")
        else:
            raise WrongInputError


async def run(ctx, input, only_letters=True):
    ctx.logger.info(f"Letter set: {repr(shared.letters)}")
    asyncio.create_task(watch_stdin(ctx.logger))

    def preprocess(text):
        return re.sub("[^a-zA-Z ]", "", text) if bool(only_letters) else text

    def select_counts(counter):
        return {letter: counter[letter] for letter in shared.letters}

    return (
        Stream.read_from(input, max_parallel=1)
            .each(lambda x: asyncio.sleep(2))
            .map(preprocess)
            .each(print)
            .map(Counter)
            .map(select_counts)
    )

output_type = "application/x-ndjson"