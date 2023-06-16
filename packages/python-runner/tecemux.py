import asyncio
import logging
import random
import socket
from attrs import define, field
from inet import IPPacket, TCPSegment, USE_LITTLENDIAN
from hardcoded_magic_values import CommunicationChannels as CC


USE_LITTLENDIAN()   
@define
class _ChannelContext:
    _channel_enum: CC
    
    _reader: asyncio.StreamReader
    _writer: asyncio.StreamWriter
    
    _global_queue: asyncio.Queue
    _global_instance_id: str

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

    def _set_logger(self, logger):
        self._logger = logger
    
    def readline(self):
        return self._reader.readline()

    def readuntil(self, separator=b'\n'):
        return self._reader.readuntil(separator)

    def read(self, n=-1):
        return self._reader.read(n)

    def readexactly(self, n):
        return self._reader.readexactly(n)
    
    def __aiter__(self):
        return self._reader.__aiter__

    async def __anext__(self):
        val = await self._reader.readline()
        if val == b'':
            raise StopAsyncIteration
        return val

    async def send_ACK(self, sequence_number):
        await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=self._get_channel_id(), flags=['ACK'], ack=sequence_number)))
    
    async def _send_pause_ACK(self, sequence_number):
        await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=self._get_channel_id(), flags=['ACK','SYN'], ack=sequence_number)))

    async def open(self):
        #self._logger.debug(f'Tecemux/{self._get_channel_name()}: [-] Channel opening request is send')
        
        if not self._channel_opened:

            await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=self._get_channel_id(), data=b'', flags=['PSH'])))
            
            buf = b'' if self._global_instance_id is None else (self._global_instance_id.encode() + str(self._get_channel_id()).encode())

            await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=self._get_channel_id(), data=buf, flags=['PSH'])))

            self._channel_opened = True

    async def close(self):
        self._logger.debug(f'Tecemux/{self._get_channel_name()}: [-] Channel close request is send')
        await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=self._get_channel_id(),data=b'' if self._global_instance_id is None else self._global_instance_id, flags=['FIN'])))

    async def queue_up_incoming(self, pkt):
        #if SYN & ACK flag is up, pause channel
        if pkt.get_segment().is_flag('SYN') and pkt.get_segment().is_flag('ACK'):
            self._logger.debug(f'Tecemux/{self._get_channel_name()}: [-] Channel pause request received')
            self.set_pause(True)
            await self.send_ACK(pkt.get_segment().seq)
            return
        
        #if ACK flag is up, reasume channel
        if not pkt.get_segment().is_flag('SYN') and pkt.get_segment().is_flag('ACK'):
            self.set_pause(False)
            return

        #if PSH flag is up, confirm
        if pkt.segment.is_flag('PSH'):
            await self.send_ACK(pkt.get_segment().seq)
        
        self._writer.write(pkt.get_segment().data)
        await self._writer.drain()

    async def queue_up_outcoming(self, data):

        def wrap(channel_enum, buf):
            channel_id = int(channel_enum.value)
            return IPPacket(segment=TCPSegment(dst_port=channel_id, flags=['PSH'],data=buf))

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

    async def write(self, data):

        if not self._channel_opened:
            await self.open()

        await self.queue_up_outcoming(data)

    async def drain(self):
        if not self._channel_paused:
            await self._writer.drain()
        return True

    def wait_closed(self):
         return self._writer.wait_closed()

    def set_pause(self, state):
        self._channel_paused = state


@define
class Tecemux:

    _queue: asyncio.Queue = field(default=None)
    _reader: asyncio.StreamReader = field(default=None)
    _writer: asyncio.StreamWriter = field(default=None)

    _incoming_data_forwarder: asyncio.coroutine = field(default=None)
    _outcoming_data_forwarder: asyncio.coroutine = field(default=None)

    _instance_id: str = field(default=None)
    _channels: dict = field(default={})
    _logger: logging.Logger = field(default=None)
    _global_stop_event: asyncio.Event = asyncio.Event()
    _sequence_number: int  = field(default=0)
    _last_sequence_received: int = field(default=0)
    
    async def connect(self, reader, writer):
        self._reader = reader
        self._writer = writer
        self._sequence_number = abs(int((random.random() * (2 ** 32)) / 2))
        self._global_stop_event.clear()

    @staticmethod
    async def prepare_tcp_connection(server_host, server_port):
        return await asyncio.open_connection(server_host, server_port)

    @staticmethod
    async def prepare_socket_connection():
        rsock, wsock = socket.socketpair()
        reader, _ = await asyncio.open_unix_connection(sock=rsock)
        _, writer = await asyncio.open_unix_connection(sock=wsock)
        return reader, writer

    async def prepare(self, force_open=False):
        self._queue = asyncio.Queue()
        self._channels = {channel: _ChannelContext(channel, *await Tecemux.prepare_socket_connection(), self._queue, self._instance_id ,self._logger) for channel in CC}    
        
        if force_open:
            [await channel.open() for channel in self.get_channels()]

    def set_logger(self, logger):
        self._logger = logger

    def get_channel(self, channel):
        return self._channels[channel]
    
    def get_channels(self):
        return self._channels.values()
        
    @staticmethod
    def _chunk_preview(value):
        return f'{value[0:5]}... <len:{len(value)}>' if len(value)>5 else f'{value}'
    
    async def stop(self):
        for channel in self.get_channels():
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

                current_packet_size = IPPacket().from_buffer_with_pseudoheader(buffer).len

                if len(buffer) >= current_packet_size:

                    single_packet_buffer = buffer[:current_packet_size]
                    pkt = IPPacket().from_buffer_with_pseudoheader(single_packet_buffer)
                    self._last_sequence_received = pkt.get_segment().seq                    
                    self._logger.debug(f'Tecemux/MAIN: [<] Full incomming packet with sequence number {self._last_sequence_received} from Transform Hub was received')

                    channel = CC(str(pkt.get_segment().dst_port))
                    
                    await self._channels[channel].queue_up_incoming(pkt)

                    self._logger.debug(f'Tecemux/MAIN: [<] Packet {Tecemux._chunk_preview(single_packet_buffer)} forwarded to {channel.name} stream')
                    buffer = buffer[current_packet_size:]
                else:
                    self._logger.warning(f'Tecemux/MAIN: [<] Not full packet received. Getting additional data chunk')
                    break

        self._logger.debug(f'Tecemux/MAIN: Incomming data forwarder finished')

    async def outcoming_data_forward(self):
        while not self._global_stop_event.is_set():
            try:
                pkt = self._queue.get_nowait()

                #inject sequence number
                if pkt.segment.seq == 0:
                    pkt.segment.seq = self._sequence_number
                    self._sequence_number += 1

                chunk = pkt.build(for_STH=True).to_buffer_with_tcp_pseudoheader()
                             
                self._logger.debug(f'Tecemux/MAIN: [>] Outcoming chunk {Tecemux._chunk_preview(chunk)} is waiting to send to Transform Hub')
                self._writer.write(chunk)
                await self._writer.drain()
                self._queue.task_done()
                self._logger.debug(f'Tecemux/MAIN: [>] Chunk {Tecemux._chunk_preview(chunk)} with sequence number: {pkt.segment.seq} was sent to Transform Hub')
            except asyncio.QueueEmpty:
                await asyncio.sleep(0)

        self._logger.debug(f'Tecemux/MAIN: Outcoming data forwarder finished')
