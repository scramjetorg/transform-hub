import asyncio
import codecs
import pytest
import sys
from tecemux import Tecemux
from inet import IPPacket,TCPSegment
from logging_setup import LoggingSetup
from hardcoded_magic_values import CommunicationChannels as CC

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

    await client_a.connect(rsock_a,wsock_b)
    await client_b.connect(rsock_b,wsock_a)

    await client_a.prepare()
    await client_b.prepare()

    await client_a.loop()
    await client_b.loop()
        
    
    return client_a, client_b

class TestTecemux:

    async def _close_clients(self, a, b):
        await a.stop()
        await b.stop()

        await a.wait_until_end()
        await b.wait_until_end()

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

        assert isinstance(protocol._reader,asyncio.StreamReader)
        assert isinstance(protocol._writer,asyncio.StreamWriter)
        assert protocol._sequence_number > 0

    @pytest.mark.asyncio
    async def test_forward_from_main_to_channel(self, local_socket_connection):
        client_a, client_b = local_socket_connection

        data_to_send ="{'foo':'bar'}"
        destination_channel = CC.CONTROL
        
        pkt = IPPacket(src_addr='172.25.44.3',dst_addr='172.25.44.254',segment=TCPSegment(dst_port=int(destination_channel.value),flags=['PSH'],data=data_to_send))
        
        client_a._writer.write(pkt.to_buffer_with_tcp_pseudoheader())
        await client_a._writer.drain()

        assert (await client_b.get_channel(destination_channel).read(100)).decode() == data_to_send

        await self._close_clients(client_a, client_b)

    @pytest.mark.asyncio
    async def test_forward_channel_between_a_b(self, local_socket_connection):
        client_a, client_b = local_socket_connection


        channel_alpha = CC.CONTROL
        channel_beta = CC.IN

        client_a.get_channel(channel_alpha).write("{'foo':'bar'}")
        await client_a._writer.drain()

        client_a.get_channel(channel_beta).write("{'bar':'foo2'}")
        await client_a._writer.drain()

        assert (await client_b.get_channel(channel_alpha).read(100)).decode() == "{'foo':'bar'}"
        assert (await client_b.get_channel(channel_beta).read(100)).decode() == "{'bar':'foo2'}"

        await self._close_clients(client_a,client_b)

    async def test_stream_write_redirection(self, local_socket_connection):
        client_a, client_b = local_socket_connection
    
        stream = codecs.getwriter('utf-8')(client_a.get_channel(CC.HOST))

        print("Hi!", end='', file=stream)
    
        assert (await client_b.get_channel(CC.HOST).read(100)).decode() == "Hi!"

        await self._close_clients(client_a,client_b)

    async def test_stream_read_redirection(self, local_socket_connection):
        
        from scramjet.streams import Stream
    
        client_a, client_b = local_socket_connection
    
        input_stream = codecs.getwriter('utf-8')(client_a.get_channel(CC.HOST))
        output_stream = Stream.read_from(client_b.get_channel(CC.HOST)).decode('utf-8')

        print("Test", file=input_stream)
        assert await output_stream.read() == 'Test\n'
        
        await self._close_clients(client_a,client_b)
        
    async def test_stderr_write_redirection(self, local_socket_connection):
        client_a, client_b = local_socket_connection
        
        sys.stderr = codecs.getwriter('utf-8')(client_a.get_channel(CC.STDERR))
        sys.stderr.flush = lambda: True

        print("Error", end='\n', file=sys.stderr)

        sys.stderr = sys.__stderr__
    
        assert (await client_b.get_channel(CC.STDERR).read(100)).decode() == "Error\n"

        await self._close_clients(client_a,client_b)

