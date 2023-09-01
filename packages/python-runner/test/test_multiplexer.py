import asyncio
import pytest
from tecemux.multiplexer import Tecemux

class TestMultiplexer:
    async def _close_clients(self, a, b):
        await a.stop()
        await b.stop()

    def test_default_init(self):
        protocol = Tecemux()
        assert isinstance(protocol, Tecemux)
        assert protocol._sequence_number == 0

    @pytest.mark.asyncio
    async def test_socket_connection(self):
        
        protocol = Tecemux()

        assert protocol._reader == None
        assert protocol._writer == None
        
        await protocol.connect(*await Tecemux.prepare_socket_connection())

        assert isinstance(protocol._reader, asyncio.StreamReader)
        assert isinstance(protocol._writer, asyncio.StreamWriter)
        assert protocol._sequence_number > 0