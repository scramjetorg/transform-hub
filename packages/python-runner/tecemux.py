import asyncio
import socket
from attrs import define, field

from inet import IPPacket, TCPSegment
from hardcoded_magic_values import CommunicationChannels as CC

@define
class Tecemux:
    @define
    class ChannelContext:
        _name: str
        
        _reader: asyncio.StreamReader
        _writer: asyncio.StreamWriter
        _queue: asyncio.Queue
        _global_writer: asyncio.StreamWriter

        _channel_paused: bool = False

        async def queue_up(self, data):

            def wrap(channel_enum, buf):
                channel_id = int(channel_enum.value)
                return IPPacket(src_addr='0.0.0.0',dst_addr='0.0.0.0',segment=TCPSegment(dst_port=channel_id,data=buf)).build().to_buffer()

            if self._channel_paused:
                self._queue.put(data)
            else:
                while not self._queue.empty():
                    try:
                        buf = await self._queue.get()

                        self._global_writer.write(wrap(self._name,data))
                        self._queue.task_done()
                    except asyncio.QueueEmpty:
                        await self._global_writer.drain()
                        break
            self._global_writer.write(wrap(self._name,data))
            

        async def read(self, len):
            return await self._reader.read(len)
        
        async def write(self, data):
            await self.queue_up(data)

        async def drain(self):
            if not self._channel_paused:
                await self._writer.drain()
                return await self._global_writer.drain()
            return True

        def set_pause(self, state):
            self._channel_paused = state

        def get_name(self):
            return self._name.name

    _queue: asyncio.Queue = field(default=None)
    _reader: asyncio.StreamReader = field(default=None)
    _writer: asyncio.StreamWriter = field(default=None)

    _incoming_data_forwarder: asyncio.coroutine = field(default=None)
    _outcoming_data_forwarder: asyncio.coroutine = field(default=None)
    
    _channels = field(default={})
    _logger = field(default=None)
    _stop_event = asyncio.Event()

    async def connect(self, reader, writer):
        self._reader = reader
        self._writer = writer
        self._stop_event.clear()

    @staticmethod
    async def prepare_tcp_connection(server_host, server_port):
        return await asyncio.open_connection(server_host, server_port)
    
    @staticmethod
    async def prepare_socket_connection():
        rsock, wsock = socket.socketpair()
        reader, _ = await asyncio.open_unix_connection(sock=rsock)
        _, writer = await asyncio.open_unix_connection(sock=wsock)
        return reader,writer
    

    async def prepare(self):
        self._channels = {channel : Tecemux.ChannelContext(channel, *await Tecemux.prepare_socket_connection(), asyncio.Queue(), self._writer) for channel in CC }
        self._queue = asyncio.Queue()
    
    
    def set_logger(self,logger):
        self._logger = logger

    def get_channel(self, channel):
        return self._channels[channel]
    
    async def stop(self):
        await self._writer.drain()
        self._writer.close()
        await self._writer.wait_closed()
        self._stop_event.set()        

        for channel in self._channels.values():            
            await channel._writer.drain()
            channel._writer.close()
            await channel._writer.wait_closed()


    async def wait_until_end(self):
        await self._stop_event.wait()
        await asyncio.gather(*[self._incoming_data_forwarder, self._outcoming_data_forwarder])
        
        self._logger.debug(f'Tecemux/MAIN: [-] Finished')

    async def loop(self):
       
        loop = asyncio.get_event_loop()

        self._incoming_data_forwarder = loop.create_task(self.incoming_data_forward())
        self._outcoming_data_forwarder = loop.create_task(self.outcoming_data_forward())

    async def incoming_data_forward(self):
        while not self._reader.at_eof():
            buf = await self._reader.read(1024)

            if not buf:
                break

            if len(buf) < 20:
                self._logger.warning(f'Tecemux/MAIN: [<] Too few data from Transform Hub received')
                continue

            self._logger.debug(f'Tecemux/MAIN: [<] Incomming chunk from Transform Hub was received')

            pkt = IPPacket().from_buffer(buf)
            channel = CC(str(pkt.get_segment().dst_port))
            await self._channels[channel].write(pkt.get_segment().data)
            self._logger.debug(f'Tecemux/MAIN: [<] Chunk forwarded to {channel.name} steam')

        self._logger.debug(f'Tecemux/MAIN: Incomming data forwarder finished')

    async def outcoming_data_forward(self):
        
        while not self._reader.at_eof():
            try:
                chunk = await self._queue.get_nowait()
                self._logger.debug(f'Tecemux/MAIN: [>] Outcoming chunk "{chunk}" is waiting to send to Transform Hub')
                self._writer.write(chunk)
                await self._writer.drain()
                await self._queue.task_done()
                self._logger.debug(f'Tecemux/MAIN: [>] Chunk "{chunk}" was sent to Transform Hub')
            except asyncio.QueueEmpty:
                await asyncio.sleep(0)

        self._logger.debug(f'Tecemux/MAIN: Outcoming data forwarder finished')
