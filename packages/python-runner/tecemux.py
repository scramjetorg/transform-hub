import asyncio
import logging
import socket

from attrs import define, field

from inet import IPPacket, TCPSegment
from hardcoded_magic_values import CommunicationChannels as CC


class _StreamReader:

    def __init__(self, stream):
        self._stream = stream

    def __getattr__(self, name):
        return getattr(self._stream, name)

    async def readline(self):
        return await self._stream.readline()

    async def readuntil(self, separator=b'\n'):
        return await self._stream.readuntil(separator)

    async def read(self, n=-1):
        return await self._stream.read(n)

    async def readexactly(self, n):
        return await self._stream.readexactly(n)


class _StreamWriter:

    def __init__(self, stream):
        self._stream = stream

    def __getattr__(self, name):
        return getattr(self._stream, name)

    async def wait_closed(self):
        return await self._stream.wait_closed()

    async def drain(self):
        return await self._stream.drain()


@define
class _ChannelContext:
    _channel_enum: CC
    _reader: _StreamReader
    _writer: _StreamWriter
    _global_queue: asyncio.Queue
    _logger: logging.Logger = field(default=None)

    _internal_queue: asyncio.Queue = field(init=False)
    _channel_paused: bool = field(default=False, init=False)
    _channel_opened: bool = field(default=False, init=False)

    def __attrs_post_init__(self):
        self._internal_queue = asyncio.Queue()

    def _get_channel_name(self):
        return str(self._channel_enum.name)

    def _get_channel_id(self):
        return int(self._channel_enum.value)

    async def open(self):
        self._logger.debug(f'Tecemux/{self._get_channel_name()}: [-] Channel opening request is send')
        await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=self._get_channel_id(), flags=['PSH'])).build().to_buffer())

    async def close(self):
        self._logger.debug(f'Tecemux/{self._get_channel_name()}: [-] Channel close request is send')
        await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=self._get_channel_id(), flags=['FIN'])).build().to_buffer())

    async def pause(self):
        self._channel_paused = True
        self._logger.debug(f'Tecemux/{self._get_channel_name()}: [-] Channel pause confirmation is send')
        await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=self._get_channel_id(), flags=['ACK'])).build().to_buffer())

    async def resume(self):
        self._channel_paused = False
        self._logger.debug(f'Tecemux/{self._get_channel_name()}: [-] Channel resume confirmation is send')
        await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=self._get_channel_id(), flags=['ACK'])).build().to_buffer())

    async def queue_up_incoming(self, buf):
        pkt = IPPacket().from_buffer(buf)

        if pkt.segment.is_flag('SYN') and pkt.segment.is_flag('ACK'):
            self._logger.debug(f'Tecemux/{self._get_channel_name()}: [-] Channel pause request received')
            await self.pause()
            return

        self._writer.write(pkt.get_segment().data)
        await self._writer.drain()

    async def queue_up_outcoming(self, data):

        def wrap(channel_enum, buf):
            channel_id = int(channel_enum.value)
            return IPPacket(segment=TCPSegment(dst_port=channel_id, data=buf)).build().to_buffer()

        if self._channel_paused:
            self._logger.debug(f'Tecemux/{self._get_channel_name()}: [-] Channel paused. Data queued up internally for future')
            await self._internal_queue.put(data)
        else:
            while not self._internal_queue.empty():
                try:
                    buf = await self._internal_queue.get()
                    await self._global_queue.put(wrap(self._channel_enum, data))
                except asyncio.QueueEmpty:
                    self._logger.debug(f'Tecemux/{self._get_channel_name()}: [-] All data stored during pause were redirected to global queue')
                    break
        await self._global_queue.put(wrap(self._channel_enum, data))

    async def read(self, len):
        return await self._reader.read(len)

    async def write(self, data):

        if not self._channel_opened:
            await self.open()

        await self.queue_up_outcoming(data)

    async def drain(self):
        if not self._channel_paused:
            await self._writer.drain()
        return True

    def set_pause(self, state):
        self._channel_paused = state


@define
class Tecemux:

    _queue: asyncio.Queue = field(default=None)
    _reader: asyncio.StreamReader = field(default=None)
    _writer: asyncio.StreamWriter = field(default=None)

    _incoming_data_forwarder: asyncio.coroutine = field(default=None)
    _outcoming_data_forwarder: asyncio.coroutine = field(default=None)

    _channels: dict = field(default={})
    _logger: logging.Logger = field(default=None)
    _global_stop_event: asyncio.Event = asyncio.Event()

    async def connect(self, reader, writer):
        self._reader = reader
        self._writer = writer
        self._global_stop_event.clear()

    @staticmethod
    async def prepare_tcp_connection(server_host, server_port):
        return await asyncio.open_connection(server_host, server_port)

    @staticmethod
    async def prepare_socket_connection():
        rsock, wsock = socket.socketpair()
        reader, _ = await asyncio.open_unix_connection(sock=rsock)
        _, writer = await asyncio.open_unix_connection(sock=wsock)
        return _StreamReader(reader), _StreamWriter(writer)

    async def prepare(self):
        self._queue = asyncio.Queue()
        self._channels = {channel: _ChannelContext(channel, *await Tecemux.prepare_socket_connection(), self._queue, self._logger) for channel in CC}

    def set_logger(self, logger):
        self._logger = logger

    def get_channel(self, channel):
        return self._channels[channel]
    
    @staticmethod
    def _chunk_preview(value):
        return f'{value[0:5]}... <len:{len(value)}>' if len(value)>5 else f'{value}'
    async def stop(self):
        for channel in self._channels.values():
            await channel.close()
            await channel._writer.drain()
            channel._writer.close()
            await channel._writer.wait_closed()

        await self._writer.drain()
        self._writer.close()
        await self._writer.wait_closed()
        self._global_stop_event.set()

    async def wait_until_end(self):
        await self._global_stop_event.wait()
        await asyncio.gather(*[self._incoming_data_forwarder, self._outcoming_data_forwarder])

        self._logger.debug(f'Tecemux/MAIN: [-] Finished')

    async def loop(self):

        loop = asyncio.get_event_loop()

        self._incoming_data_forwarder = loop.create_task(self.incoming_data_forward())
        self._outcoming_data_forwarder = loop.create_task(self.outcoming_data_forward())

    async def incoming_data_forward(self):
        buffer = b''

        incoming_parser_finish_loop = asyncio.Event()

        MINIMAL_IP_PACKET_LENGTH = 20
        READ_CHUNK_SIZE = 1024

        while not self._global_stop_event.is_set():

            chunk = await self._reader.read(READ_CHUNK_SIZE)

            if not chunk:
                incoming_parser_finish_loop.set()

            buffer = buffer + chunk

            buffer_len = len(buffer)

            if incoming_parser_finish_loop.is_set() and buffer_len > 0 and buffer_len < MINIMAL_IP_PACKET_LENGTH:

                self._logger.warning(f'Tecemux/MAIN: [<] Too few data is waiting in global buffer but stream finished')
                break

            while not (len(buffer) < MINIMAL_IP_PACKET_LENGTH):

                current_packet_size = IPPacket().from_buffer(buffer).len

                if len(buffer) >= current_packet_size:

                    self._logger.debug(f'Tecemux/MAIN: [<] Full incomming packet from Transform Hub was received')

                    single_packet_buffer = buffer[:current_packet_size]
                    pkt = IPPacket().from_buffer(single_packet_buffer)
                    channel = CC(str(pkt.get_segment().dst_port))

                    await self._channels[channel].queue_up_incoming(single_packet_buffer)

                    self._logger.debug(f'Tecemux/MAIN: [<] Packet {Tecemux._chunk_preview(single_packet_buffer)} forwarded to {channel.name} stream')
                    buffer = buffer[current_packet_size:]
                else:
                    self._logger.warning(f'Tecemux/MAIN: [<] Not full packet received. Getting additional data chunk')
                    break

        self._logger.debug(f'Tecemux/MAIN: Incomming data forwarder finished')

    async def outcoming_data_forward(self):
        while not self._global_stop_event.is_set():
            try:
                chunk = self._queue.get_nowait()
                self._logger.debug(f'Tecemux/MAIN: [>] Outcoming chunk {Tecemux._chunk_preview(chunk)} is waiting to send to Transform Hub')
                self._writer.write(chunk)
                await self._writer.drain()
                self._queue.task_done()
                self._logger.debug(f'Tecemux/MAIN: [>] Chunk {Tecemux._chunk_preview(chunk)} was sent to Transform Hub')
            except asyncio.QueueEmpty:
                await asyncio.sleep(0)

        self._logger.debug(f'Tecemux/MAIN: Outcoming data forwarder finished')
