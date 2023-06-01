import asyncio
import socket
from attrs import define, field

from inet import IPPacket, TCPSegment
from hardcoded_magic_values import CommunicationChannels as CC


class TecemuxStreamReader:

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
    
class TecemuxStreamWriter:

    def __init__(self, stream):
        self._stream = stream

    def __getattr__(self, name):
        return getattr(self._stream, name)

    async def wait_closed(self):
        return await self._stream.wait_closed()

    async def drain(self):
        return await self._stream.drain()
    
@define
class Tecemux:
    @define
    class ChannelContext:
        _name: str
        
        _reader: TecemuxStreamReader
        _writer: TecemuxStreamWriter
        _queue: asyncio.Queue
        _global_queue: asyncio.Queue

        _channel_paused: bool = False
        _channel_opened: bool = False
       
        async def open(self):
            channel_id = int(self._name.value)
            await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=channel_id,flags=['PSH'])).build().to_buffer())

        async def close(self):
            channel_id = int(self._name.value)
            await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=channel_id,flags=['FIN'])).build().to_buffer())

        async def pause(self):
            self._channel_paused = True
            #channel_id = int(self._name.value)
            #await self._global_queue.put(IPPacket(segment=TCPSegment(dst_port=channel_id,flags=['FIN'])).build().to_buffer())


        async def queue_up_incoming(self,buf):
            pkt = IPPacket().from_buffer(buf)
            self._writer.write(pkt.get_segment().data)
            await self._writer.drain()

        async def queue_up_outcoming(self, data):
            def wrap(channel_enum, buf):
                channel_id = int(channel_enum.value)
                return IPPacket(segment=TCPSegment(dst_port=channel_id,data=buf)).build().to_buffer()

            if self._channel_paused:
                await self._queue.put(data)
            else:
                while not self._queue.empty():
                    try:
                        buf = await self._queue.get()
                        await self._global_queue.put(wrap(self._name,data))
                    except asyncio.QueueEmpty:
                        break
            await self._global_queue.put(wrap(self._name,data))

            

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

        def get_name(self):
            return self._name.name

    _queue: asyncio.Queue = field(default=None)
    _reader: asyncio.StreamReader = field(default=None)
    _writer: asyncio.StreamWriter = field(default=None)

    _incoming_data_forwarder: asyncio.coroutine = field(default=None)
    _outcoming_data_forwarder: asyncio.coroutine = field(default=None)
    
    _channels = field(default={})
    _logger = field(default=None)
    _global_stop_event = asyncio.Event()

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
        return TecemuxStreamReader(reader),TecemuxStreamWriter(writer)
    

    async def prepare(self):
        self._queue = asyncio.Queue()
        self._channels = {channel : Tecemux.ChannelContext(channel, *await Tecemux.prepare_socket_connection(), asyncio.Queue(), self._queue) for channel in CC }

    
    def set_logger(self,logger):
        self._logger = logger

    def get_channel(self, channel):
        return self._channels[channel]
    
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
                    
                    self._logger.debug(f'Tecemux/MAIN: [<] Packet forwarded to {channel.name} steam')
                    buffer = buffer[current_packet_size:]
                else:
                    self._logger.warning(f'Tecemux/MAIN: [<] Not full packet received. Getting additional data chunk')
                    break

        self._logger.debug(f'Tecemux/MAIN: Incomming data forwarder finished')
           

    async def outcoming_data_forward(self):
        
        while not self._global_stop_event.is_set():
            try:
                chunk = self._queue.get_nowait()
                self._logger.debug(f'Tecemux/MAIN: [>] Outcoming chunk "{chunk}" is waiting to send to Transform Hub')
                self._writer.write(chunk)
                await self._writer.drain()
                self._queue.task_done()
                self._logger.debug(f'Tecemux/MAIN: [>] Chunk "{chunk}" was sent to Transform Hub')
            except asyncio.QueueEmpty:
                await asyncio.sleep(0)

        self._logger.debug(f'Tecemux/MAIN: Outcoming data forwarder finished')
