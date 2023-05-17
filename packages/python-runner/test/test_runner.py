import asyncio
import pytest
from runner_tecemux import Tecemux


@pytest.fixture()
async def local_socket_connection():
    protocol = Tecemux()  
    await protocol.connect(*await Tecemux.prepare_socket_connection())
    return protocol

class TestTecemux:
    def test_default_init(self):
        protocol = Tecemux()
        assert isinstance(protocol, Tecemux)

    @pytest.mark.asyncio
    async def test_socket_connection(self):
        
        protocol = Tecemux()

        assert protocol._reader == None
        assert protocol._writer == None
        
        await protocol.connect(*await Tecemux.prepare_socket_connection())

        assert isinstance(protocol._reader,asyncio.StreamReader)
        assert isinstance(protocol._writer,asyncio.StreamWriter)
        
        assert True

    @pytest.mark.asyncio
    async def test_tecemux_pipe(self, local_socket_connection):
        protocol = local_socket_connection
        protocol._writer.write(b'dnkrozz')
        await protocol._writer.drain()

        assert await protocol._reader.read(100) == b'dnkrozz'