import asyncio
import pytest
from tecemux import Tecemux
from inet import IPPacket,TCPSegment
from hardcoded_magic_values import CommunicationChannels as CC
from runner_tecemux import get_logger


@pytest.fixture()
async def local_socket_connection():
    client_a = Tecemux()
    client_a.set_logger(get_logger())

    client_b = Tecemux()
    client_b.set_logger(get_logger())


    rsock_a, wsock_a = await Tecemux.prepare_socket_connection()
    rsock_b, wsock_b = await Tecemux.prepare_socket_connection()

    await client_a.connect(rsock_a,wsock_b)
    await client_b.connect(rsock_b,wsock_a)

    await client_a.prepare()
    await client_b.prepare()

    await client_a.loop()
    await client_b.loop()
        
    
    return client_a, client_b

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


    @pytest.mark.asyncio
    async def test_forward_from_main_to_channel(self, local_socket_connection):
        client_a, client_b = local_socket_connection

        data_to_send ="{'foo':'bar'}"
        destination_channel = CC.CONTROL
        
        pkt = IPPacket(src_addr='172.25.44.3',dst_addr='172.25.44.254',segment=TCPSegment(dst_port=int(destination_channel.value),flags=['ACK'],data=data_to_send))
        
        client_a._writer.write(pkt.to_buffer())
        await client_a._writer.drain()

        assert (await client_b.get_channel(destination_channel).read(100)).decode() == data_to_send

        await client_a.stop()
        await client_b.stop()

        await client_a.wait_until_end()
        await client_a.wait_until_end()

    @pytest.mark.asyncio
    async def test_forward_channel_between_a_b(self, local_socket_connection):
        client_a, client_b = local_socket_connection

        data_to_send ="{'foo':'bar'}"
        source_channel = CC.CONTROL
               
        await client_a.get_channel(source_channel).write(data_to_send)
        await client_a.get_channel(source_channel).drain()

        assert (await client_b.get_channel(source_channel).read(100)).decode() == data_to_send

        await client_a.stop()
        await client_b.stop()

        await client_a.wait_until_end()
        await client_a.wait_until_end()
