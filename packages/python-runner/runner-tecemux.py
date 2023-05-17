import asyncio
import sys
import codecs
import socket
from attrs import define, field

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


        def get_name(self):
            return self._name.name

    _queue: asyncio.Queue = asyncio.Queue()
    _reader: asyncio.StreamReader = field(default=None)
    _writer: asyncio.StreamWriter = field(default=None)
    _logger = field(default=get_logger())
    _channels = field(default={})

    async def connect(self, reader, writer):
        self._reader = reader
        self._writer = writer


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
    
    async def sandbox(self):
        self._logger.debug("Begin sandbox")

        await self._queue.put(b'test')
        await asyncio.sleep(0)

        self._writer.write(b'test 2')
        await self._writer.drain()

        self._logger.debug("End sandbox")
    async def loop(self):
       
        loop = asyncio.get_event_loop()
        for channel in CC:
            self._channels[channel]._task_reader = loop.create_task(Tecemux.channel_reader(self._channels[channel]))
            self._channels[channel]._task_writer = loop.create_task(Tecemux.channel_writer(self._channels[channel]))

        channel_readers  = asyncio.gather(*[ channel._task_reader for channel in self._channels.values()])


        protocol_reader = loop.create_task(Tecemux.protocol_reader(self._reader, self._queue))
        protocol_writer = loop.create_task(Tecemux.protocol_writer(self._writer, self._queue))
        sandbox = loop.create_task(self.sandbox())

        await asyncio.gather(*[protocol_reader, protocol_writer, sandbox])
        print('End main loop')
    

    @staticmethod
    async def protocol_reader(reader, queue):
        while True:
            chunk = await reader.read(100)
            get_logger().debug(f'Chunk received: {chunk}')
            await queue.put(chunk)
            get_logger().debug(f'Chunk redirected: {chunk}')

    @staticmethod
    async def protocol_writer(writer, queue):
        while True:
            chunk = await queue.get()
            get_logger().debug(f'PROTOCOL: Chunk waiting: {chunk}')
            #writer.write(chunk)
            queue.task_done()
            get_logger().debug(f'PROTOCOL: Chunk consumed: {chunk}')

    @staticmethod
    async def channel_reader(channel_context):
        while True:
            #print(f'{channel_context.get_name()}: READ!')
            await asyncio.sleep(0)
    
    @staticmethod
    async def channel_writer(channel_context):
        while True:
            #print(f'{channel_context.get_name()}: WRITE!')
            await asyncio.sleep(0)
    
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


runner = Runner(instance_id, sequence_path, get_logger())
asyncio.run(runner.main(server_host, server_port))
