import asyncio
import codecs
import pytest
import sys
from tecemux.channel import ChannelState
from tecemux.inet import IPPacket, TCPSegment
from tecemux.hardcoded_magic_values import CommunicationChannels as CC


class TestChannels:

    async def _close_clients(self, a, b):
        await a.stop()
        await b.stop()

    @pytest.mark.asyncio
    async def test_forward_from_main_to_channel(self, local_socket_connection):
        client_a, client_b = local_socket_connection

        data_to_send = "{'foo':'bar'}"
        destination_channel = CC.CONTROL

        pkt = IPPacket(src_addr='172.25.44.3', dst_addr='172.25.44.254',
                       segment=TCPSegment(dst_port=int(destination_channel.value), flags=['PSH'], data=data_to_send))

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

        await self._close_clients(client_a, client_b)

    @pytest.mark.asyncio
    async def test_write_and_read_from_the_same_side(self, local_socket_connection):
        client_a, client_b = local_socket_connection

        channel_alpha = CC.CONTROL

        client_a.get_channel(channel_alpha).write("{'foo':'bar'}")
        await client_a._writer.drain()

        data = None

        with pytest.raises(asyncio.TimeoutError):
            data = await asyncio.wait_for(client_a.get_channel(channel_alpha).read(1),
                                          timeout=0.5)

        assert data is None

        await self._close_clients(client_a, client_b)

    @pytest.mark.asyncio
    async def test_stream_write_redirection(self, local_socket_connection):
        client_a, client_b = local_socket_connection

        stream = codecs.getwriter('utf-8')(client_a.get_channel(CC.HOST))

        print("Hi!", end='', file=stream)

        assert (await client_b.get_channel(CC.HOST).read(100)).decode() == "Hi!"

        await self._close_clients(client_a, client_b)

    @pytest.mark.asyncio
    async def test_stream_read_redirection(self, local_socket_connection):

        from scramjet.streams import Stream

        client_a, client_b = local_socket_connection

        input_stream = codecs.getwriter('utf-8')(client_a.get_channel(CC.HOST))
        output_stream = Stream.read_from(client_b.get_channel(CC.HOST)).decode('utf-8')

        print("Test", file=input_stream)
        assert await output_stream.read() == 'Test\n'

        await self._close_clients(client_a, client_b)

    @pytest.mark.asyncio
    async def test_stderr_write_redirection(self, local_socket_connection):
        client_a, client_b = local_socket_connection

        sys.stderr = codecs.getwriter('utf-8')(client_a.get_channel(CC.STDERR))
        sys.stderr.flush = lambda: True

        print("Error", end='\n', file=sys.stderr)

        sys.stderr = sys.__stderr__

        assert (await client_b.get_channel(CC.STDERR).read(100)).decode() == "Error"

        await self._close_clients(client_a, client_b)

    @pytest.mark.asyncio
    async def test_extra_channel(self, local_socket_connection):
        client_a, client_b = local_socket_connection

        test_channel = await client_a.open_channel(initial_state=ChannelState.OPENED)
        test_channel.write("{'foo':'bar'}\n")

        await asyncio.sleep(1)

        data = await client_b.get_channel(test_channel._get_channel_name()).readuntil()

        assert data.decode() == "{'foo':'bar'}\n"

        await self._close_clients(client_a, client_b)

    @pytest.mark.asyncio
    async def test_many_extra_channels(self, local_socket_connection):
        client_a, client_b = local_socket_connection

        def test_func(c):
            return str(c._get_unused_extra_channel_id([int(id) for id in client_a._extra_channels.keys()]))

        [await client_a.open_channel(initial_state=ChannelState.OPENED) for _ in range(5)]

        assert len(client_a._extra_channels) == 5

        assert test_func(client_a) == '15'

        del client_a._extra_channels['13']

        assert len(client_a._extra_channels) == 4

        assert test_func(client_a) == '13'

        await client_a.open_channel(initial_state=ChannelState.OPENED)

        assert len(client_a._extra_channels) == 5

        await self._close_clients(client_a, client_b)

    @pytest.mark.asyncio
    async def test_write_and_read_from_the_same_side_on_extra_channel(self, local_socket_connection):
        client_a, client_b = local_socket_connection

        channel = await client_a.open_channel(initial_state=ChannelState.OPENED)

        channel.write("{'foo':'bar'}")

        await client_a.sync()
        await client_a._writer.drain()

        data = None

        with pytest.raises(asyncio.TimeoutError):
            data = await asyncio.wait_for(channel.read(1), timeout=0.5)

        assert data is None

        await self._close_clients(client_a, client_b)

    @pytest.mark.asyncio
    async def test_readuntil(self, local_socket_connection):
        client_a, client_b = local_socket_connection

        channel = CC.CONTROL
        separator = '\r\n\r\n'

        client_a.get_channel(channel).write("{'foo':'bar'}")
        await client_a._writer.drain()

        client_a.get_channel(channel).write("{'foo':'bar'}")
        await client_a._writer.drain()

        client_a.get_channel(channel).write(separator + "{'should-not-be-returned'}")
        await client_a._writer.drain()

        data = (await client_b.get_channel(channel).readuntil(separator.encode())).decode()

        assert data == "{'foo':'bar'}{'foo':'bar'}\r\n\r\n"

        await self._close_clients(client_a, client_b)

    @pytest.mark.asyncio
    async def test_wih_scramjet_framework_to_list(self, local_socket_connection):
        client_a, client_b = local_socket_connection
        channel = CC.CONTROL

        from scramjet.streams import Stream

        client_a.get_channel(channel).write("foo\n")
        client_a.get_channel(channel).write("bar\n")
        client_a.get_channel(channel).write("baz\n")
        await client_a.get_channel(channel).end()

        output_list = await Stream.read_from(client_b.get_channel(channel)).to_list()

        assert output_list == [b'foo\n', b'bar\n', b'baz\n']

        await self._close_clients(client_a, client_b)

    @pytest.mark.asyncio
    async def test_wih_scramjet_framework_to_pipe(self, local_socket_connection):
        client_a, client_b = local_socket_connection
        channel = CC.CONTROL

        from scramjet.streams import Stream

        client_a.get_channel(channel).write("foo")
        client_a.get_channel(channel).write("bar\n")
        client_a.get_channel(channel).write("foz")
        client_a.get_channel(channel).write("baz\n")
        await client_a.get_channel(channel).end()

        final_stream = Stream()

        Stream.read_from(client_b.get_channel(channel)).pipe(final_stream)

        output_list = await final_stream.to_list()

        assert output_list == [b'foobar\n', b'fozbaz\n']

        await self._close_clients(client_a, client_b)

    @pytest.mark.asyncio
    async def test_wih_scramjet_framework_write_to(self, local_socket_connection):
        client_a, client_b = local_socket_connection
        channel = CC.CONTROL

        data = [b'foo\n', b'bar\n', b'baz\n']

        from scramjet.streams import Stream

        await Stream.read_from(data).write_to(client_a.get_channel(channel))
        await client_a.get_channel(channel).end()

        output = Stream.read_from(client_b.get_channel(channel))
        assert await output.to_list() == data

        await self._close_clients(client_a, client_b)