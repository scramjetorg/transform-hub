import asyncio
import sys
import os
import codecs
import importlib.util
from scramjet.streams import Stream
from logging_setup import LoggingSetup
from hardcoded_magic_values import CommunicationChannels as CC
from hardcoded_magic_values import RunnerMessageCodes as msg_codes
from magic_utils import send_encoded_msg, read_and_decode

STARTUP_LOGFILE = './python-runner-startup.log'

sequence_path = os.getenv('SEQUENCE_PATH')
server_port = os.getenv('INSTANCES_SERVER_PORT')
instance_id = os.getenv('INSTANCE_ID')


class Runner:
    def __init__(self, instance_id, sequence_path, log_setup) -> None:
        self.instance_id = instance_id
        self.seq_path = sequence_path
        self._logging_setup = log_setup
        self.logger = log_setup.logger


    async def main(self, server_host, server_port):
        self.logger.info("Connecting to host...")
        await self.init_connections(server_host, server_port)

        # Do this early to have access to any thrown exceptions and logs.
        self.connect_stdio()
        self.connect_log_stream()

        config, args = await self.handshake()
        self.logger.info("Communication established.")

        await self.run_instance(args)


    async def init_connections(self, host, port):
        async def connect(channel):
            self.logger.debug(f"Connecting to {host}:{port}...")
            reader, writer = await asyncio.open_connection(host, port)
            self.logger.debug("Connected.")

            writer.write(self.instance_id.encode())
            writer.write(channel.value.encode())
            await writer.drain()
            self.logger.debug(f"Sent ID {self.instance_id} on {channel.name}.")

            return (channel, reader, writer)

        conn_futures = [connect(channel) for channel in CC]
        connections = await asyncio.gather(*conn_futures)

        def is_incoming(channel):
            return channel in [CC.STDIN, CC.IN, CC.CONTROL]

        # Pick read or write stream depending on channel.
        self.streams = {
            channel: reader if is_incoming(channel) else writer
            for channel, reader, writer in connections
        }


    def connect_stdio(self):
        sys.stdout = codecs.getwriter("utf-8")(self.streams[CC.STDOUT])
        sys.stderr = codecs.getwriter("utf-8")(self.streams[CC.STDERR])
        sys.stdin = Stream.read_from(self.streams[CC.STDIN]).decode("utf-8")
        # pretend to have API compatibiliy
        sys.stdout.flush = lambda: True
        sys.stderr.flush = lambda: True


    def connect_log_stream(self):
        self.logger.info("Switching to main log stream...")
        target = codecs.getwriter("utf-8")(self.streams[CC.LOG])
        self._logging_setup.switch_to(target)
        self._logging_setup.flush_temp_handler()
        self.logger.info("Log stream connected.")


    async def handshake(self):
        monitoring = self.streams[CC.MONITORING]
        control = self.streams[CC.CONTROL]

        self.logger.info(f"Sending PING")
        send_encoded_msg(monitoring, msg_codes.PING)

        code, data = await read_and_decode(control)
        if code == msg_codes.PONG.value:
            self.logger.info(f"Got configuration: {data}")
            return data['appConfig'], data['args']


    async def run_instance(self, args):
        self.logger.debug(f"Loading sequence from {self.seq_path}...")
        spec = importlib.util.spec_from_file_location("sequence", self.seq_path)
        self.sequence = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.sequence)
        # switch to sequence dir so that relative paths will work
        os.chdir(os.path.dirname(self.seq_path))

        context = AppContext(self)
        input = Stream.read_from(self.streams[CC.IN]).decode("utf-8")

        self.logger.info("Running instance...")
        result = self.sequence.run(context, input, *args)
        if asyncio.iscoroutine(result):
            result = await result
        output = result.map(lambda s: s.encode())
        await output.write_to(self.streams[CC.OUT])

        self.logger.info('Finished.')


class AppContext:
    def __init__(self, runner) -> None:
        self.logger = runner.logger


log_setup = LoggingSetup(STARTUP_LOGFILE)

log_setup.logger.info("Starting up...")
log_setup.logger.debug(f"server_port: {server_port}")
log_setup.logger.debug(f"instance_id: {instance_id}")
log_setup.logger.debug(f"sequence_path: {sequence_path}")

if not sequence_path or not server_port or not instance_id:
    log_setup.logger.error("Undefined config variable! <blows raspberry>")
    sys.exit(2)

runner = Runner(instance_id, sequence_path, log_setup)
asyncio.run(runner.main('localhost', server_port))
