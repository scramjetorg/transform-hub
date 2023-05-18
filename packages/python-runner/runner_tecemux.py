import asyncio
import sys
import codecs
from tecemux import Tecemux
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

        self.protocol = Tecemux(logger=self.logger)

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
