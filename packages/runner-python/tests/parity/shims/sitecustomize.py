import asyncio


_ORIGINAL_OPEN_CONNECTION = asyncio.open_connection
_OPEN_WRITERS = []


async def _open_connection_keepalive(*args, **kwargs):
    reader, writer = await _ORIGINAL_OPEN_CONNECTION(*args, **kwargs)
    _OPEN_WRITERS.append(writer)
    setattr(reader, "_sth_writer_keepalive", writer)
    return reader, writer


asyncio.open_connection = _open_connection_keepalive

if hasattr(asyncio, "streams"):
    asyncio.streams.open_connection = _open_connection_keepalive
