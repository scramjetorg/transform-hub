""" multiplexer.py - entry point for tecemux implementation for Python
"""

import asyncio
import logging
import random
import socket

from attrs import define, field
from .barrier import Barrier
from .inet import IPPacket
from .hardcoded_magic_values import CommunicationChannels as CC
from .channel import ChannelContext, ChannelGuard, ChannelState
from .proxy import HTTPProxy
TECEMUX_INTERNAL_VERBOSE_DEBUG = False


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

    _proxy = field(default=None)
    _proxy_task = asyncio.coroutine = field(default=None)

    def _get_proxy_uri(self):
        """Returns proxy config URI for aiohttp

        Returns:
            str: aiohttp proxy config
        """
        return self._proxy.get_proxy_uri()

    def get_channel_guard(self):
        return ChannelGuard(self)

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
            force_open (bool, optional): If True, all channels will be opened immediately,
             Otherwise, will be opened on demand. Defaults to False.
        """
        self._extra_channels = {}
        self._queue = asyncio.Queue()
        self._global_sync_barrier = Barrier(len(CC))
        self._required_channels = {channel: ChannelContext(channel,
                                                           self._queue,
                                                           self._instance_id,
                                                           self._logger,
                                                           self._global_stop_channel_event,
                                                           self._global_sync_channel_event,
                                                           self._global_sync_barrier,
                                                           ChannelState.CREATED) for channel in CC}
        if force_open:
            [await channel.open() for channel in self.get_required_channels()]

        self._proxy = HTTPProxy()
        self._proxy_task = asyncio.create_task(self._proxy.run(self))

    def _get_unused_extra_channel_id(self, used_channel_ids, start_from=10):
        """Returns lowest, unused channel number

        Args:
            used_channel_ids (list): List of *USED* channel ids
            start_from (int, optional): Minimal channel id. Defaults to 10.

        Returns:
            int: lowest, unused channel number
        """
        used_channel_ids = sorted(set(used_channel_ids))
        if len(used_channel_ids) == 0 or used_channel_ids[0] != start_from:
            return start_from
        for i, v in enumerate(used_channel_ids, start_from):
            if i != v:
                return i
        return i + 1

    async def open_channel(self, channel_id=None, force_open=False,
                           initial_state: ChannelState = ChannelState.CREATED) -> ChannelContext:
        """Opens additional channel in Tecemux

        Args:
            channel_id (CC, str, optional): Name for new channel. Defaults to None.
            force_open (bool, optional): Sends empty PSH packet right now. Defaults to False.
            initial_state (_ChannelState., optional): Initial channel state. Defaults to ChannelState.CREATED.

        Returns:
            ChannelContext: Openned channel
        """

        channel = str(channel_id) if channel_id is not None else None

        if channel not in self._extra_channels.keys():

            channel = str(self._get_unused_extra_channel_id(
                [int(id) for id in self._extra_channels.keys()])) if channel is None else channel

            self._extra_channels[channel] = ChannelContext(channel,
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

        return self._extra_channels[channel]

    def set_logger(self, logger: logging.Logger) -> None:
        """Sets logger

        Args:
            logger (logging.Logger): Logger object
        """
        self._logger = logger

    def get_channel(self, channel) -> ChannelContext:
        """Returns single channel context

        Args:
            channel (str, CC): Channel name

        Returns:
            ChannelContext: Channel context
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

        await self._finish_proxy()
        await self._finish_channels()
        await self._finish_incoming()
        await self._finish_outcoming()

    async def _finish_proxy(self) -> None:
        """ Stops proxy
        """
        try:
            self._proxy_task.cancel()
            await asyncio.gather(*[self._proxy_task])
        except asyncio.CancelledError:
            pass

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
                await asyncio.wait_for(channel._outcoming_process_task, timeout=1)
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
                chunk = await asyncio.wait_for(self._reader.read(READ_CHUNK_SIZE), 1)

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
                        self._debug(f'Tecemux/MAIN: [<] Full incoming packet with sequence number'
                                    f'{self._last_sequence_received} from Transform Hub was received')

                        dst_port = pkt.get_segment().dst_port

                        if dst_port < 9:
                            channel = CC(str(dst_port))
                            channel_name = channel.name
                            await self._required_channels[channel].queue_up_incoming(pkt)
                        else:
                            channel = str(dst_port)
                            channel_name = f'EXTRA_CHANNEL_{channel}'
                            try:
                                await self._extra_channels[channel].queue_up_incoming(pkt)
                            except KeyError:
                                await self.open_channel(channel, initial_state=ChannelState.OPENED)
                                try:
                                    await self._extra_channels[channel].queue_up_incoming(pkt)
                                except KeyError:
                                    self._debug('Tecemux/MAIN: [<] Unknown channel')

                        self._debug(f'Tecemux/MAIN: [<] Packet {Tecemux._chunk_preview(single_packet_buffer)}'
                                    f' forwarded to {channel_name} stream')
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
                pkt = await asyncio.wait_for(self._queue.get(), timeout=1)
                self._queue.task_done()

                # inject sequence number
                if pkt.segment.seq == 0:
                    pkt.segment.seq = self._sequence_number
                    self._sequence_number += 1

                chunk = pkt.build(
                    for_STH=True).to_buffer_with_tcp_pseudoheader()

                self._debug(f'Tecemux/MAIN: [>] Outcoming chunk {Tecemux._chunk_preview(chunk)}'
                            ' is waiting to send to Transform Hub')
                self._writer.write(chunk)
                await self._writer.drain()
                self._debug(f'Tecemux/MAIN: [>] Chunk {Tecemux._chunk_preview(chunk)} with sequence number:'
                            f' {pkt.segment.seq} was sent to Transform Hub')
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
