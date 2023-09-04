import pytest
import sys
from logging_setup import LoggingSetup
from tecemux.multiplexer import Tecemux


def get_logger():
    if not hasattr(get_logger, "log_setup"):
        get_logger.log_setup = LoggingSetup(sys.stdout)
    return get_logger.log_setup.logger


@pytest.fixture()
async def local_socket_connection():
    client_a = Tecemux()
    client_a.set_logger(get_logger())

    client_b = Tecemux()
    client_b.set_logger(get_logger())

    rsock_a, wsock_a = await Tecemux.prepare_socket_connection()
    rsock_b, wsock_b = await Tecemux.prepare_socket_connection()

    await client_a.connect(rsock_a, wsock_b)
    await client_b.connect(rsock_b, wsock_a)

    await client_a.prepare()
    await client_b.prepare()

    await client_a.loop()
    await client_b.loop()

    return client_a, client_b
