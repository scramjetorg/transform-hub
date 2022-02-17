import sys
from scramjet.streams import Stream

async def run(context, input):
    await (
        Stream
            .read_from(sys.stdin)
            .map(lambda s: f"Got on stdin: {s}")
            .write_to(sys.stdout)
    )
