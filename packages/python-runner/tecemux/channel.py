""" channel.py - contains Tecemux channel management in Python
"""

import asyncio
import logging


from attrs import define
from enum import Enum

from .barrier import Barrier
from .inet import IPPacket, TCPSegment, SequenceOrder
from .hardcoded_magic_values import CommunicationChannels as CC

SequenceOrder().use_little_endian()

TECEMUX_INTERNAL_VERBOSE_DEBUG = False


class ChannelState(Enum):
    """Internal class describes possible channel state
    """

    CREATED = 1
    OPENED = 2
    PAUSED = 3
    ENDED = 4


class ChannelGuard:
    """Internal class to open/close channels for external usage
    """

    def __init__(self, protocol):
        """Inits channel guard

        Args:
            protocol (Tecemux): Tecemux object
        """

        self._protocol = protocol
        self._channel_name = None

    async def __aenter__(self):
        """Opens new channel and returns guard

        Returns:
            _ChannelGuard: async guard object
        """

        channel = await self._protocol.open_channel(force_open=True)
        self._channel_name = channel._channel_enum
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Closes channel

        Args:
            exc_type: Unused
            exc_val: Unused
            exc_tb: Unused
        """
        await self._protocol.get_channel(self._channel_name).end()
        await self._protocol.get_channel(self._channel_name).close()
        del self._protocol._extra_channels[self._channel_name]

    def inject_tecemux_details_as(self, provider):
        """Retuns channel details for external lib

        Args:
            provider (Any): External provider

        Returns:
            Any: External provider object with channel details
        """

        return provider('tecemux', self._channel_name)

    def get_proxy_uri(self):
        """Returns proxy config URI for aiohttp

        Returns:
            str: aiohttp config
        """

        return self._protocol._get_proxy_uri()


@define
class ChannelContext:
    """Internal class to manage single channel
    """

    _channel_enum: CC

    _global_queue: asyncio.Queue
    _global_instance_id: str

    _logger: logging.Logger
    _internal_outcoming_queue: asyncio.Queue
    _internal_incoming_queue: asyncio.Queue

    _stop_channel_event: asyncio.Event
    _sync_channel_event: asyncio.Event
    _sync_barrier: Barrier

    _read_buffer: bytearray
    _outcoming_process_task: asyncio.Task

    _state: ChannelState

    def __init__(self, channel,
                 queue: asyncio.Queue,
                 instance_id: str,
                 logger: logging.Logger,
                 stop_event: asyncio.Event,
                 sync_event: asyncio.Event,
                 sync_barrier: Barrier,
                 state: ChannelState):

        self._channel_enum = channel
        self._global_queue = queue
        self._global_instance_id = instance_id
        self._logger = logger
        self._internal_outcoming_queue = asyncio.Queue()
        self._internal_incoming_queue = asyncio.Queue()
        self._stop_channel_event = stop_event
        self._sync_channel_event = sync_event
        self._sync_barrier = sync_barrier
        self._outcoming_process_task = asyncio.create_task(self._outcoming_process_tasks(),
                                                           name=f'{self._get_channel_name()}_PROCESS_TASK')
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

        if self._state == ChannelState.ENDED and isep == -1:
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
        if self._state == ChannelState.ENDED and self._internal_incoming_queue.empty():
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

                if self._state == ChannelState.ENDED and self._internal_incoming_queue.empty():
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

        await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=self._get_channel_id(),
                                                                 flags=['ACK'], ack=sequence_number)))

    async def _send_pause_ACK(self, sequence_number: int) -> None:
        """"Add to global queue an pause packet to send

        Args:
            sequence_number (int): Value for Acknowledge field
        """

        await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=self._get_channel_id(),
                                                                 flags=['ACK', 'SYN'], ack=sequence_number)))

    async def open(self) -> None:
        """Open channel
        """

        if self._state == ChannelState.CREATED:
            # Channels with ids 0 - 8 are have special opening procedure: send intance id with channel number

            if self._get_channel_id() < 9:
                buf = b'' if self._global_instance_id is None else (
                    self._global_instance_id.encode() + str(self._get_channel_id()).encode())
            else:
                buf = b''

            await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=self._get_channel_id(),
                                                                     data=buf, flags=['PSH'])))

            self._state = ChannelState.OPENED

    async def end(self) -> None:
        """Send EOF on current channel
        """

        await self._internal_outcoming_queue.join()
        await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=self._get_channel_id(),
                                                                 data=b'', flags=['PSH'])))
        self._state = ChannelState.ENDED

    async def close(self) -> None:
        """Close current channel
        """

        self._debug(f'Tecemux/{self._get_channel_name()}: [-] Channel close request is send')
        await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=self._get_channel_id(),
                                                                 data=b'' if self._global_instance_id is None
                                                                 else self._global_instance_id, flags=['FIN'])))

    async def queue_up_incoming(self, pkt: IPPacket) -> None:
        """Redirects incoming data from provided packet to current channel

        Args:
            pkt (IPPacket): Redirected packet from outside
        """
        # if SYN & ACK flag is up, pause channel
        if pkt.get_segment().is_flag('SYN') and pkt.get_segment().is_flag('ACK'):
            self._debug(f'Tecemux/{self._get_channel_name()}: [-] Channel pause request received')
            self._state = ChannelState.PAUSED
            await self.send_ACK(pkt.get_segment().seq)
            return

        # if ACK flag is up, reasume channel
        if not pkt.get_segment().is_flag('SYN') and pkt.get_segment().is_flag('ACK'):
            self._state = ChannelState.OPENED
            return

        # if PSH flag is up, confirm
        if pkt.segment.is_flag('PSH'):
            await self.send_ACK(pkt.get_segment().seq)

        if pkt.segment.is_flag('FIN'):
            self._state = ChannelState.ENDED
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

        if self._state is not ChannelState.PAUSED:
            while not self._internal_outcoming_queue.empty():
                try:
                    buf = await asyncio.wait_for(self._internal_outcoming_queue.get(), 1)
                    await self._global_queue.put(wrap(self._get_channel_id(), buf))
                    self._internal_outcoming_queue.task_done()
                except asyncio.QueueEmpty:
                    self._debug(f'Tecemux/{self._get_channel_name()}:'
                                '[-] All data stored during pause were redirected to global queue')
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
