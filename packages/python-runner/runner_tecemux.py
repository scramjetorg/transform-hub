import asyncio
import sys
import codecs
import socket
from attrs import define, field

from inet import TCPSegment,IPPacket
from logging_setup import LoggingSetup
from hardcoded_magic_values import CommunicationChannels as CC

def get_logger():
    if not hasattr(get_logger, "log_setup"):
        get_logger.log_setup = LoggingSetup(sys.stdout)
    return get_logger.log_setup.logger

sequence_path = '/tmp/'
server_port = 8001
server_host = 'localhost'
instance_id = '1234'


@define
class Tecemux:
    @define
    class ChannelContext:
        _name: str
        _queue: asyncio.Queue
        _reader: asyncio.StreamReader
        _writer: asyncio.StreamWriter

        _task_reader: asyncio.coroutine = None
        _task_writer: asyncio.coroutine = None

        
        def encode(data):
            pass

        def decode(data):
            pass

        def get_name(self):
            return self._name.name

    _queue: asyncio.Queue = asyncio.Queue()
    _reader: asyncio.StreamReader = field(default=None)
    _writer: asyncio.StreamWriter = field(default=None)

    _incoming_data_forwarder: asyncio.coroutine = field(default=None)
    _outcoming_data_forwarder: asyncio.coroutine = field(default=None)
    
    _logger = field(default=get_logger())
    _channels = field(default={})
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
        self._channels = {channel : Tecemux.ChannelContext(channel, *await Tecemux.prepare_socket_connection(),asyncio.Queue()) for channel in CC }

    def get_channel(self, channel):
        return self._channels[channel]
    
    async def stop(self):
        await self._writer.drain()
        self._writer.close()
        await self._writer.wait_closed()
        self._stop_event.set()        

    async def wait_until_end(self):
        await self._stop_event.wait()

        await asyncio.gather(*[ channel._task_reader for channel in self._channels.values()])
        await asyncio.gather(*[ channel._task_writer for channel in self._channels.values()])
        await asyncio.gather(*[self._incoming_data_forwarder, self._outcoming_data_forwarder])
        
        get_logger().debug(f'Tecemux/MAIN: [-] Finished')

    async def loop(self):
       
        loop = asyncio.get_event_loop()
        for channel in CC:
            self._channels[channel]._task_reader = loop.create_task(Tecemux.channel_reader(self._channels[channel], self._stop_event))
            self._channels[channel]._task_writer = loop.create_task(Tecemux.channel_writer(self._channels[channel], self._stop_event))

        self._incoming_data_forwarder = loop.create_task(self.incoming_data_forward())
        self._outcoming_data_forwarder = loop.create_task(self.outcoming_data_forward())

    async def incoming_data_forward(self):
        while not self._reader.at_eof():
            buf = await self._reader.read(1024)

            if not buf:
                break

            if len(buf) < 20:
                get_logger().warning(f'Tecemux/MAIN: [<] Too few data from Transform Hub received')
                continue

            get_logger().debug(f'Tecemux/MAIN: [<] Incomming chunk from Transform Hub was received')

            pkt = TCPSegment().from_buffer(buf)
            channel = CC(pkt.dst_port)
            await self._channels[channel]._queue.put(pkt.data)
            get_logger().debug(f'Tecemux/MAIN: [<] Chunk forwarded to {channel} steam')

        get_logger().debug(f'Tecemux/MAIN: Incomming data forwarder finished')

    async def outcoming_data_forward(self):
        
        while not self._reader.at_eof():

            try:
                chunk = await self._queue.get_nowait()
                get_logger().debug(f'Tecemux/MAIN: [>] Outcoming chunk "{chunk}" is waiting to send to Transform Hub')
                self._writer.write(chunk)
                await self._writer.drain()
                await self._queue.task_done()
                get_logger().debug(f'Tecemux/MAIN: [>] Chunk "{chunk}" was sent to Transform Hub')
            except asyncio.QueueEmpty:
                await asyncio.sleep(0)

        get_logger().debug(f'Tecemux/MAIN: Outcoming data forwarder finished')

    @staticmethod
    async def channel_reader(channel_context, stop_event):

        get_logger().debug(f'Tecemux/{channel_context.get_name()}: Channel reader started.')

        while not stop_event.is_set():
            #get_logger().debug(f'Tecemux/{channel_context.get_name()}: READ!')
            await asyncio.sleep(0)

        get_logger().debug(f'Tecemux/{channel_context.get_name()}: Channel writer finished.')
    
    @staticmethod
    async def channel_writer(channel_context, stop_event):
        
        get_logger().debug(f'Tecemux/{channel_context.get_name()}: Channel writer started.')

        while not stop_event.is_set():
            #get_logger().debug(f'Tecemux/{channel_context.get_name()}: WRITE!')
            await asyncio.sleep(0)

        get_logger().debug(f'Tecemux/{channel_context.get_name()}: Channel writer finished.')

    
class Runner:
    def __init__(self, instance_id, sequence_path, logger) -> None:
        self.instance_id = instance_id
        self.seq_path = sequence_path
        self.logger = logger
        
        self.protocol = None

    def connect_stdio(self):
        
        sys.stdout = codecs.getwriter('utf-8')(self.protocol.get_channel(CC.STDOUT).writer)
        sys.stderr = codecs.getwriter('utf-8')(self.protocol.get_channel(CC.STDERR).writer)
        sys.stdout.flush = lambda: True
        sys.stderr.flush = lambda: True



    async def main(self, server_host, server_port):
        self.logger.info('Connecting to host...')

        self.protocol = Tecemux()

        # self.logger.debug(f'Connecting to {server_host}:{server_port}...')
        # await self.protocol.connect(*await Tecemux.prepare_tcp_connection(server_host, server_port))
        
        self.logger.debug(f'Connecting locally via unix sockets')
        await self.protocol.connect(*await Tecemux.prepare_socket_connection())
        
        self.logger.debug('Connected.')

        await self.protocol.prepare()
        
        #self.connect_stdio()
        
        await self.protocol.loop()

        self.logger.debug("Run sequence")
        
        await self.protocol.stop()

        await self.protocol.wait_until_end()

        self.logger.debug("End main")

if __name__ == '__main__':
    runner = Runner(instance_id, sequence_path, get_logger())
    asyncio.run(runner.main(server_host, server_port))
