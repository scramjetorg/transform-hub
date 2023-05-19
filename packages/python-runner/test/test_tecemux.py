import asyncio
import pytest
from tecemux import Tecemux
from inet import IPPacket,TCPSegment
from hardcoded_magic_values import CommunicationChannels as CC
from runner_tecemux import get_logger


@pytest.fixture()
async def local_socket_connection():
    protocol = Tecemux()
    protocol.set_logger(get_logger())
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

    @pytest.mark.asyncio
    async def test_tecemux_forward_on_channel(self, local_socket_connection):
        protocol = local_socket_connection
        data_to_send ="{'foo':'bar'}"
        destination_channel = CC.CONTROL
        await protocol.prepare()
        await protocol.loop()

        pkt = IPPacket(src_addr='172.25.44.3',dst_addr='172.25.44.254',segment=TCPSegment(dst_port=int(destination_channel.value),flags=['ACK'],data=data_to_send))
        protocol._writer.write(pkt.to_buffer())
        await protocol._writer.drain()

        assert (await protocol.get_channel(destination_channel).read(len(data_to_send)))

    @pytest.mark.asyncio
    async def test_tecemux_forward_from_channel(self, local_socket_connection):
        protocol = local_socket_connection
        
        data_to_send ="{'foo':'bar'}"
        source_channel = CC.CONTROL

        await protocol.prepare()
        
        channel = protocol.get_channel(source_channel)

        await protocol.loop()
        await channel.write(data_to_send)
        await channel.drain()

        data = await protocol._reader.read(100)
        pkt = IPPacket.from_buffer(data).get_segment()

        assert pkt.data == data_to_send.encode('utf-8')
        assert pkt.dst_port == int(source_channel.value)
        


