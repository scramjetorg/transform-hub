import asyncio
import logging
import random
import socket

from attrs import define, field
from barrier import Barrier
from enum import Enum
from inet import IPPacket, TCPSegment, SequenceOrder
from hardcoded_magic_values import CommunicationChannels as CC


TECEMUX_INTERNAL_VERBOSE_DEBUG = False

SequenceOrder().use_little_endian()


@define
class _ChannelContext:
    """Internal class to manage single channel
    """

    class _ChannelState(Enum):
        """Internal class describes possible channel state
        """

        PREPARED = 1
        OPENED = 2
        PAUSED = 3
        ENDED = 4

    _channel_enum: CC

    _global_queue: asyncio.Queue
    _global_instance_id: str

    _logger: logging.Logger
    _event_loop: asyncio.unix_events._UnixSelectorEventLoop
    _internal_outcoming_queue: asyncio.Queue
    _internal_incoming_queue: asyncio.Queue

    _stop_channel_event: asyncio.Event
    _sync_channel_event: asyncio.Event
    _sync_barrier: Barrier

    _read_buffer: bytearray
    _outcoming_process_task: asyncio.Task
    
    _state: _ChannelState

    def __init__(self, channel,
                 queue: asyncio.Queue,
                 instance_id: str, 
                 logger: logging.Logger,
                 stop_event: asyncio.Event,
                 sync_event: asyncio.Event,
                 sync_barrier: Barrier,
                 state: _ChannelState):
        
        self._channel_enum = channel
        self._global_queue = queue
        self._global_instance_id = instance_id
        self._logger = logger
        self._event_loop = asyncio.get_running_loop()
        self._internal_outcoming_queue = asyncio.Queue()
        self._internal_incoming_queue = asyncio.Queue()
        self._stop_channel_event = stop_event
        self._sync_channel_event = sync_event
        self._sync_barrier = sync_barrier
        self._outcoming_process_task = asyncio.create_task(self._outcoming_process_tasks(), name=f'{self._get_channel_name()}_PROCESS_TASK')
        self._read_buffer = bytearray()
        self._state = state

    async def sync(self) -> None:
        """Waits until internal queues will be empty (packets will be processed)
        """

        if self._is_incoming():
            await self._internal_incoming_queue.join()

        await self._internal_outcoming_queue.join()

    def _is_incoming(self) -> bool:
        """Returns whether channel is mostly read by Tememux

        Returns:
            bool: True is mostly read by Runner, False otherwise
        """
        return self._channel_enum in [CC.STDIN, CC.IN, CC.CONTROL]

    async def _outcoming_process_tasks(self) -> None:
        """ Internal loop for outcoming data from channel
        """
        while True:
            try:
                await self._queue_up_outcoming()
                await asyncio.sleep(0)

                if self._stop_channel_event.is_set():
                    return
            except asyncio.CancelledError:
                return

    def _debug(self, msg):
        """Wrapper for printing debug messages

        Args:
            msg (str): Debug message
        """
        if TECEMUX_INTERNAL_VERBOSE_DEBUG:
            self._logger.debug(msg)

    def _get_channel_name(self) -> str:
        """Returns channel name

        Returns:
            str: Channel name
        """

        if isinstance(self._channel_enum, CC):
            return str(self._channel_enum.name)
        else:
            return str(self._channel_enum)

    def _get_channel_id(self) -> int:
        """Return channel id

        Returns:
            int: Channel id
        """
        if isinstance(self._channel_enum, CC):
            return int(self._channel_enum.value)
        else:
            return int(self._channel_enum)

    def _set_logger(self, logger: logging.Logger) -> None:
        """Sets new logger

        Args:
            logger (logging.Logger): Logger object
        """
        self._logger = logger

    async def readline(self) -> bytes:
        """Reads data from current channel until '\n' appears

        Returns:
            bytes: Bufer data from channel
        """
        sep = b'\n'
        line = await self.readuntil(sep)
        return line

    async def readuntil(self, separator=b'\n') -> bytes:
        """Reads data from current channel until provided separator appears

        Args:
            separator (bytes, optional): Defaults to b'\n'.

        Returns:
            bytes: Buffer data from channel
        """
        seplen = len(separator)
       
        offset = 0
        isep = 0
        while True:
            buflen = len(self._read_buffer)

            if buflen - offset >= seplen:
                isep = self._read_buffer.find(separator, offset)

                if isep != -1:
                    break

                offset = buflen + 1 - seplen

            if (not await self._get_data()):
                break
        
        if self._state == _ChannelContext._ChannelState.ENDED and isep == -1:
            chunk = self._read_buffer.copy()
            self._read_buffer.clear()
        else:
            chunk = self._read_buffer[:isep + seplen]
            
        del self._read_buffer[:isep + seplen]
        return bytes(chunk)

    async def _get_data(self) -> bool:
        """Internal method, returns True if data are moved from queue to _read_buffer, false otherwise

        Returns:
            bool: True if data are moved from queue to _read_buffer, false otherwise
        """
        if self._state == _ChannelContext._ChannelState.ENDED and self._internal_incoming_queue.empty():
            return False

        while True:
            try:
                buf = self._internal_incoming_queue.get_nowait()                
                
                if buf == b'':
                    return False
                
                self._read_buffer.extend(buf)
                break
            except asyncio.QueueEmpty:

                await asyncio.sleep(0)

                if self._state == _ChannelContext._ChannelState.ENDED and self._internal_incoming_queue.empty():
                    return False

            except asyncio.CancelledError:
                return False
            
        await asyncio.sleep(0)
        return True       
        
    async def read(self, n: int = -1) -> bytes:
        """Reads up to 'n' bytes of data from current channel

        Args:
            n (int, optional): Number of bytes. Defaults to -1.

        Returns:
            bytes: Buffer data from channel
        """
        if n == 0:
            return b''
        
        if not self._read_buffer:
            await self._get_data()

        data = bytes(memoryview(self._read_buffer)[:n])
        del self._read_buffer[:n]
        return data
    
    def __aiter__(self):
        return self

    async def __anext__(self):
        val = await self.readline()
        
        if val == b'':
            raise StopAsyncIteration
        return val

    async def send_ACK(self, sequence_number: int) -> None:
        """Adds to global queue an ACK packet to send.

        Args:
            sequence_number (int): Value for Acknowledge field
        """

        await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=self._get_channel_id(), flags=['ACK'], ack=sequence_number)))

    async def _send_pause_ACK(self, sequence_number: int) -> None:
        """"Add to global queue an pause packet to send

        Args:
            sequence_number (int): Value for Acknowledge field
        """

        await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=self._get_channel_id(), flags=['ACK', 'SYN'], ack=sequence_number)))

    async def open(self) -> None:
        """Open channel
        """

        if self._state == _ChannelContext._ChannelState.PREPARED:
            # Channels with ids 0 - 8 are have special opening procedure: send intance id with channel number

            if self._get_channel_id() < 9:
                buf = b'' if self._global_instance_id is None else (
                    self._global_instance_id.encode() + str(self._get_channel_id()).encode())
            else:
                buf = b''

            await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=self._get_channel_id(), data=buf, flags=['PSH'])))

            self._state = _ChannelContext._ChannelState.OPENED

    async def end(self) -> None:
        """Send EOF on current channel
        """

        await self._internal_outcoming_queue.join()
        await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=self._get_channel_id(), data=b'', flags=['PSH'])))
        self._state = _ChannelContext._ChannelState.ENDED

    async def close(self) -> None:
        """Close current channel
        """

        self._debug(f'Tecemux/{self._get_channel_name()}: [-] Channel close request is send')
        await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=self._get_channel_id(), data=b'' if self._global_instance_id is None else self._global_instance_id, flags=['FIN'])))

    async def queue_up_incoming(self, pkt: IPPacket) -> None:
        """Redirects incoming data from provided packet to current channel

        Args:
            pkt (IPPacket): Redirected packet from outside
        """
        # if SYN & ACK flag is up, pause channel
        if pkt.get_segment().is_flag('SYN') and pkt.get_segment().is_flag('ACK'):
            self._debug(f'Tecemux/{self._get_channel_name()}: [-] Channel pause request received')
            self._state = _ChannelContext._ChannelState.PAUSED
            await self.send_ACK(pkt.get_segment().seq)
            return

        # if ACK flag is up, reasume channel
        if not pkt.get_segment().is_flag('SYN') and pkt.get_segment().is_flag('ACK'):
            self._state = _ChannelContext._ChannelState.OPENED
            return

        # if PSH flag is up, confirm
        if pkt.segment.is_flag('PSH'):
            await self.send_ACK(pkt.get_segment().seq)

        if pkt.segment.is_flag('FIN'):
            self._state = _ChannelContext._ChannelState.ENDED
            return
        await self._internal_incoming_queue.put(pkt.get_segment().data)
        self._internal_incoming_queue.task_done()

    async def _queue_up_outcoming(self) -> None:
        """Redirects raw data from currect channel to global queue.

        Args:
            data (bytes): Buffer to send_incoming_process_task
        """
        def wrap(channel_id, buf):
            return IPPacket(segment=TCPSegment(dst_port=channel_id, flags=['PSH'], data=buf))

        if self._state is not _ChannelContext._ChannelState.PAUSED:
            while not self._internal_outcoming_queue.empty():
                try:
                    buf = await asyncio.wait_for(self._internal_outcoming_queue.get(),1)
                    await self._global_queue.put(wrap(self._get_channel_id(), buf))
                    self._internal_outcoming_queue.task_done()
                except asyncio.QueueEmpty:
                    self._debug(f'Tecemux/{self._get_channel_name()}: [-] All data stored during pause were redirected to global queue')
                    break
                except asyncio.TimeoutError:
                    pass
        else:
            self._debug(f'Tecemux/{self._get_channel_name()}: [-] Channel paused. Data queued up internally for future')
        
        if self._sync_channel_event.is_set():
            await self._sync_barrier.wait()

        await asyncio.sleep(0)

    def write(self, data: bytes) -> None:
        """Writes data to channel

        Args:
            data (bytes): Buffer to send to channel
        """
        if data == b'':
            return

        self._internal_outcoming_queue.put_nowait(data)


@define
class Tecemux:
    """Tecemux protocol implementation for Scramjet Transform Hub Python Runner
    """

    _queue: asyncio.Queue = field(default=None)
    _reader: asyncio.StreamReader = field(default=None)
    _writer: asyncio.StreamWriter = field(default=None)

    _incoming_data_forwarder: asyncio.coroutine = field(default=None)
    _outcoming_data_forwarder: asyncio.coroutine = field(default=None)

    _instance_id: str = field(default=None)
    _required_channels: dict = field(default={})
    _extra_channels: dict = field(default={})

    _logger: logging.Logger = field(default=None)

    _global_stop_channel_event: asyncio.Event = asyncio.Event()
    
    _global_sync_channel_event: asyncio.Event = asyncio.Event()
    _global_sync_barrier: Barrier = field(default=None, init=False)
    
    _global_stop_outcoming_event: asyncio.Event = asyncio.Event()
    _global_stop_incoming_event: asyncio.Event = asyncio.Event()
    
    _sequence_number: int = field(default=0)
    _last_sequence_received: int = field(default=0)

    def _debug(self, msg):
        if TECEMUX_INTERNAL_VERBOSE_DEBUG:
            self._logger.debug(msg)

    def _warning(self, msg):
        if TECEMUX_INTERNAL_VERBOSE_DEBUG:
            self._logger.warning(msg)


    async def connect(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        """Connects to Transform Hub via provided reader and writer objects

        Args:
            reader (asyncio.StreamReader): Main stream reader
            writer (asyncio.StreamWriter): Main stream writer
        """
        self._reader = reader
        self._writer = writer
        self._sequence_number = abs(int((random.random() * (2 ** 32)) / 2))
        self._global_stop_channel_event.clear()
        self._global_stop_incoming_event.clear()
        self._global_stop_outcoming_event.clear()

    @staticmethod
    async def prepare_tcp_connection(server_host: str, server_port: str) -> tuple:
        """Prepares TCP connection to server_host:server:port

        Args:
            server_host (str): Server address
            server_port (str): Server port

        Returns:
            tuple: Pair of StreamReader, StreamWriter
        """
        return await asyncio.open_connection(server_host, server_port)

    @staticmethod
    async def prepare_socket_connection() -> tuple:
        """Prepares Unix socket pair to create connection.

        Returns:
            tuple: Pair of StreamReader, StreamWriter
        """
        rsock, wsock = socket.socketpair()
        reader, _ = await asyncio.open_unix_connection(sock=rsock)
        _, writer = await asyncio.open_unix_connection(sock=wsock)
        return reader, writer

    async def prepare(self, force_open: bool = False) -> None:
        """Opens all channels to Transform Hub

        Args:
            force_open (bool, optional): If True, all channels will be opened immediately, Otherwise, will be opened on demand. Defaults to False.
        """

        self._queue = asyncio.Queue()
        self._global_sync_barrier = Barrier(len(CC))
        self._required_channels = {channel: _ChannelContext(channel,
                                                   self._queue,
                                                   self._instance_id,
                                                   self._logger,
                                                   self._global_stop_channel_event,
                                                   self._global_sync_channel_event,
                                                   self._global_sync_barrier,
                                                   _ChannelContext._ChannelState.PREPARED) for channel in CC}
        if force_open:
            [await channel.open() for channel in self.get_required_channels()]



    async def open_channel(self, channel_id=None, force_open=False, initial_state=_ChannelContext._ChannelState.PREPARED):
    
        if channel_id is None:
            channel = str(len(self._required_channels) + len(self._extra_channels)+1)
            
        self._extra_channels[channel] = _ChannelContext(channel,
                                    self._queue,
                                    self._instance_id,
                                    self._logger,
                                    self._global_stop_channel_event,
                                    self._global_sync_channel_event,
                                    self._global_sync_barrier,
                                    initial_state)
    
        if force_open:
            await self._extra_channels[channel].open()

        self._global_sync_barrier._parties = len(self.get_required_channels()) + len(self.get_extra_channels())
        return channel

    def set_logger(self, logger: logging.Logger) -> None:
        """Sets logger

        Args:
            logger (logging.Logger): Logger object
        """
        self._logger = logger

    def get_channel(self, channel) -> _ChannelContext:
        """Returns single channel context

        Args:
            channel (CC): Channel Enum

        Returns:
            _ChannelContext: Channel context
        """
        if isinstance(channel, CC):
            return self._required_channels[channel]
        else:
            return self._extra_channels[channel]

    async def sync(self) -> None:
        """Waits until all write tasks will be done
        """
        self._global_sync_channel_event.set()
        await self._global_sync_channel_event.wait()
        await self._global_sync_barrier.wait()
        self._global_sync_channel_event.clear()
        
        if not self._queue.empty():
            await self._queue.join()

    def get_required_channels(self) -> dict:
        """Returns only required channels by STH

        Returns:
            dict: Dict of channel's contexts
        """
        return self._required_channels.values()

    def get_extra_channels(self) -> dict:
        """Returns only extra initiated channels by runner 

        Returns:
            dict: Dict of channel's contexts
        """
        return self._extra_channels.values()
    
    @staticmethod
    def _chunk_preview(value: bytes) -> str:
        """Returns small string preview of byte chunk. For logs

        Args:
            value (bytes): Bytes to preview

        Returns:
            str: String preview
        """
        return f'{value[0:5]}... <len:{len(value)}>' if len(value) > 5 else f'{value}'

    async def stop(self) -> None:
        """ Stops protocol
        """        

        await self._finish_channels()
        await self._finish_incoming()
        await self._finish_outcoming()

    async def _finish_channels(self) -> None:
        """ Close all channels
        """

        for channel in self.get_required_channels():
            await channel.end()
            await channel.close()

        for channel in self.get_extra_channels():
            await channel.end()
            await channel.close() 

        for channel in self.get_required_channels():
            await channel._internal_outcoming_queue.join()

        for channel in self.get_extra_channels():
            await channel._internal_outcoming_queue.join()
        
        self._global_stop_channel_event.set()
        await self._global_stop_channel_event.wait()
        for channel in self.get_required_channels():
            try:
                await asyncio.wait_for(channel._outcoming_process_task,timeout=1)
            except asyncio.TimeoutError:
                pass
            except TypeError:
                pass

    async def _finish_outcoming(self) -> None:
        """ Finish outcoming forwarder and main writer to STH
        """

        self._global_stop_outcoming_event.set()
        await asyncio.sleep(0)
        await self._global_stop_outcoming_event.wait()
        await asyncio.gather(*[self._outcoming_data_forwarder])        
        await self._writer.drain()
        self._writer.close()
        await self._writer.wait_closed()

    async def _finish_incoming(self) -> None:
        """ Finish incoming forwarder
        """

        self._global_stop_incoming_event.set()
        await self._global_stop_incoming_event.wait()
        await asyncio.gather(*[self._incoming_data_forwarder])

    async def loop(self) -> None:
        """Main loop of Tecemux protocol. Starts forwarders tasks
        """
        loop = asyncio.get_event_loop()

        self._incoming_data_forwarder = loop.create_task(
            self.incoming_data_forward())
        self._outcoming_data_forwarder = loop.create_task(
            self.outcoming_data_forward())

    async def incoming_data_forward(self) -> None:
        """Loop for incoming data from Transform Hub
        """
        buffer = b''

        incoming_parser_finish_loop = asyncio.Event()

        MINIMAL_IP_PACKET_LENGTH = 20
        READ_CHUNK_SIZE = 1024

        while not self._global_stop_channel_event.is_set():
            try:
                chunk = await asyncio.wait_for(self._reader.read(READ_CHUNK_SIZE),1)

                if not chunk:
                    incoming_parser_finish_loop.set()

                buffer = buffer + chunk

                buffer_len = len(buffer)

                if incoming_parser_finish_loop.is_set() and buffer_len > 0 and buffer_len < MINIMAL_IP_PACKET_LENGTH:

                    self._warning('Tecemux/MAIN: [<] Too few data is waiting in global buffer but stream finished')
                    break
                elif incoming_parser_finish_loop.is_set() and buffer_len == 0:
                    break

                while not (len(buffer) < MINIMAL_IP_PACKET_LENGTH):

                    current_packet_size = IPPacket().from_buffer_with_pseudoheader(buffer).len

                    if len(buffer) >= current_packet_size:

                        single_packet_buffer = buffer[:current_packet_size]
                        pkt = IPPacket().from_buffer_with_pseudoheader(single_packet_buffer)
                        self._last_sequence_received = pkt.get_segment().seq
                        self._debug(f'Tecemux/MAIN: [<] Full incoming packet with sequence number {self._last_sequence_received} from Transform Hub was received')

                        dst_port = pkt.get_segment().dst_port

                        if dst_port < 9:
                            channel = CC(str(dst_port))
                            channel_name = channel.name
                            await self._required_channels[channel].queue_up_incoming(pkt)
                        else:
                            channel = str(dst_port)
                            channel_name = f'EXTRA_CHANNEL_{channel}'
                            await self._extra_channels[channel].queue_up_incoming(pkt)

                        self._debug(f'Tecemux/MAIN: [<] Packet {Tecemux._chunk_preview(single_packet_buffer)} forwarded to {channel_name} stream')
                        buffer = buffer[current_packet_size:]
                    else:
                        self._warning('Tecemux/MAIN: [<] Not full packet received. Getting additional data chunk')
                        break
            except asyncio.TimeoutError:
                if self._global_stop_channel_event.is_set():
                    break
                await asyncio.sleep(0)

            except asyncio.CancelledError:
                break
            
        self._debug('Tecemux/MAIN: Incoming data forwarder finished')

    async def outcoming_data_forward(self) -> None:
        """Loop for outcoming data to Transform Hub
        """

        while True:
            try:
                pkt = await asyncio.wait_for(self._queue.get(),timeout=1)
                self._queue.task_done()

                # inject sequence number
                if pkt.segment.seq == 0:
                    pkt.segment.seq = self._sequence_number
                    self._sequence_number += 1

                chunk = pkt.build(
                    for_STH=True).to_buffer_with_tcp_pseudoheader()

                self._debug(f'Tecemux/MAIN: [>] Outcoming chunk {Tecemux._chunk_preview(chunk)} is waiting to send to Transform Hub')
                self._writer.write(chunk)
                await self._writer.drain()
                self._debug(f'Tecemux/MAIN: [>] Chunk {Tecemux._chunk_preview(chunk)} with sequence number: {pkt.segment.seq} was sent to Transform Hub')
            except asyncio.QueueEmpty:
                if self._global_stop_outcoming_event.is_set():
                    break
                await asyncio.sleep(0)

            except asyncio.TimeoutError:
                if self._queue.empty() and self._global_stop_outcoming_event.is_set():
                    return
                await asyncio.sleep(0)

            except asyncio.CancelledError:
                    break

        self._debug('Tecemux/MAIN: Outcoming data forwarder finished')
