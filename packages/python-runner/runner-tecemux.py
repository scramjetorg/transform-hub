import asyncio
import sys
import codecs
import socket
from attrs import define
from logging_setup import LoggingSetup
from hardcoded_magic_values import CommunicationChannels as CC

sequence_path = '/tmp/'
server_port = 8001
server_host = 'localhost'
instance_id = '1234'

@define
class TeceMuxChannelContext:
    _name: str
    _queue: asyncio.Queue
    _reader: asyncio.StreamReader
    _writer: asyncio.StreamWriter

    _task_reader: asyncio.coroutine = None
    _task_writer: asyncio.coroutine = None


    def get_name(self):
        return self._name.name

class Tecemux:
    
    def __init__(self, reader,writer):
        
        self._queue = asyncio.Queue()
        self._reader = reader
        self._writer = writer
        self._channels = None

    async def prepare(self):
        async def prepare_channel(name):
            rsock, wsock = socket.socketpair()
            reader, _ = await asyncio.open_unix_connection(sock=rsock)
            _, writer = await asyncio.open_unix_connection(sock=wsock)
            return TeceMuxChannelContext(name, reader,writer,asyncio.Queue())

        self._channels = {channel : await prepare_channel(channel) for channel in CC }

    def get_channel(self, channel):
        return self._channels[channel]
    
    async def loop(self):
       
        loop = asyncio.get_event_loop()
        for channel in CC:
            self._channels[channel]._task_reader = loop.create_task(Tecemux.channel_reader(self._channels[channel]))
            self._channels[channel]._task_writer = loop.create_task(Tecemux.channel_writer(self._channels[channel]))

        channel_readers  = asyncio.gather(*[ channel._task_reader for channel in self._channels.values()])


        protocol_reader = loop.create_task(Tecemux.protocol_reader(self._reader, self._queue))
        protocol_writer = loop.create_task(Tecemux.protocol_writer(self._writer, self._queue))

        await asyncio.gather(*[protocol_reader, protocol_writer])
        print('End main loop')
    

    @staticmethod
    async def protocol_reader(reader, queue):
        while True:
            print(f'PROTOCOL: WRITE!')
            await asyncio.sleep(0)

    @staticmethod
    async def protocol_writer(writer, queue):
        while True:
            print(f'PROTOCOL: READ!')
            await asyncio.sleep(0)

    @staticmethod
    async def channel_reader(channel_context):
        while True:
            print(f'{channel_context.get_name()}: READ!')
            await asyncio.sleep(0)
    
    @staticmethod
    async def channel_writer(channel_context):
        while True:
            print(f'{channel_context.get_name()}: WRITE!')
            await asyncio.sleep(0)
    
class Runner:
    def __init__(self, instance_id, sequence_path, log_setup) -> None:
        self.instance_id = instance_id
        self.seq_path = sequence_path
        self._logging_setup = log_setup
        
        self.logger = log_setup.logger
        
        self.protocol = None

    def connect_stdio(self):
        
        sys.stdout = codecs.getwriter('utf-8')(self.protocol.get_channel(CC.STDOUT).writer)
        sys.stderr = codecs.getwriter('utf-8')(self.protocol.get_channel(CC.STDERR).writer)
        sys.stdout.flush = lambda: True
        sys.stderr.flush = lambda: True



    async def main(self, server_host, server_port):
        self.logger.info('Connecting to host...')

        self.logger.debug(f'Connecting to {server_host}:{server_port}...')
        self.protocol = Tecemux(*await asyncio.open_connection(server_host, server_port))
        self.logger.debug('Connected.')

        await self.protocol.prepare()
        
        #self.connect_stdio()
        
        await self.protocol.loop()


runner = Runner(instance_id, sequence_path, LoggingSetup(sys.stdout))
asyncio.run(runner.main(server_host, server_port))
