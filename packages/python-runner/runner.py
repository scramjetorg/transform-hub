import asyncio
import sys
import os
import codecs
import json
from pyee.asyncio import AsyncIOEventEmitter
import importlib.util
from io import DEFAULT_BUFFER_SIZE as CHUNK_SIZE
import types
from scramjet.streams import Stream
from logging_setup import LoggingSetup
from hardcoded_magic_values import CommunicationChannels as CC
from hardcoded_magic_values import RunnerMessageCodes as msg_codes

sequence_path = os.getenv('SEQUENCE_PATH')
server_port = os.getenv('INSTANCES_SERVER_PORT')
server_host = os.getenv('INSTANCES_SERVER_HOST') or 'localhost'
instance_id = os.getenv('INSTANCE_ID')
runner_connect_info = json.loads(os.getenv("RUNNER_CONNECT_INFO"))
sequence_info = json.loads(os.getenv("SEQUENCE_INFO"))

def send_encoded_msg(stream, msg_code, data={}):
    message = json.dumps([msg_code.value, data])
    stream.write(f'{message}\r\n'.encode())


class StderrRedirector:
    """A workaround class to write to both sys.stderr and the Instance stderr endpoint."""
    def __init__(self, stream):
        self.stream = stream

    def write(self, message):
        self.stream.write(message)
        sys.__stderr__.write(message)

    def flush(self):
        self.stream.flush()
        sys.__stderr__.flush()


class Runner:
    def __init__(self, instance_id, sequence_path, log_setup) -> None:
        self.connection_retry_delay = 2

        self.reconnect_interval = None
        self.connected = False
        self.instance_id = instance_id
        self.seq_path = sequence_path
        self._logging_setup = log_setup
        self.logger = log_setup.logger
        self.stop_handlers = []
        self.health_check = lambda: {'healthy': True}
        self.emitter = AsyncIOEventEmitter()
        self.keep_alive_requested = False

        self.sequence = None

        self.input_type = None
        self.instance_input = Stream()

        self.output_content_type = None
        self.instance_output = None
        self.instance_direct_output = None


    async def connect_to_host(self):
        self.logger.info('Connecting to host...')

        try:
            if not self.connected:
                await self.init_connections(server_host, server_port)

                self.connected = True
            else:
                self.logger.warn(f"Already connected!")
        except:
            self.logger.debug(f"Error connecting. Retrying in {self.connection_retry_delay}")

            await asyncio.sleep(self.connection_retry_delay)
            return await self.connect_to_host()


    async def initialize(self):
        await self.connect_to_host()

        asyncio.create_task(self.connect_input_stream())
        self.forward_output_stream()

        self.connect_stdio()
        self.connect_log_stream()
        config, args = await self.handshake()
        self.logger.info('Communication established.')

        asyncio.create_task(self.connect_control_stream())
        asyncio.create_task(self.setup_heartbeat())
        await self.forward_output_stream()

        return config, args


    async def main(self):
        config, args = await self.initialize()
        self.load_sequence()
        await self.run_instance(config, args)


    async def init_connections(self, host, port):
        async def connect(channel):
            self.logger.debug(f'Connecting to {host}:{port}...')
            reader, writer = await asyncio.open_connection(host, port)
            self.logger.debug('Connected.')

            writer.write(self.instance_id.encode())
            writer.write(channel.value.encode())
            await writer.drain()
            self.logger.debug(f'Sent ID {self.instance_id} on {channel.name}.')

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
        sys.stdout = codecs.getwriter('utf-8')(self.streams[CC.STDOUT])
        sys.stderr = StderrRedirector(codecs.getwriter('utf-8')(self.streams[CC.STDERR]))
        sys.stdin = Stream.read_from(self.streams[CC.STDIN]).decode('utf-8')
        # pretend to have API compatibiliy
        sys.stdout.flush = lambda: True
        sys.stderr.flush = lambda: True
        self.logger.info('Stdio connected.')


    def connect_log_stream(self):
        self.logger.info('Switching to main log stream...')
        log_stream = codecs.getwriter('utf-8')(self.streams[CC.LOG])
        # self._logging_setup.switch_target(log_stream)
        # self._logging_setup.flush_temp_handler()
        # self.logger.info('Log stream connected.')


    async def handshake(self):
        monitoring = self.streams[CC.MONITORING]
        control = self.streams[CC.CONTROL]

        self.logger.info(f'Sending PING')
        payload = {**runner_connect_info, **{"system":{"processPID":str(os.getpid())}}}
        send_encoded_msg(monitoring, msg_codes.PING, {"payload":payload, "sequenceInfo": sequence_info, "id": instance_id})

        message = await control.readuntil(b'\n')
        self.logger.info(f'Got message: {message}')
        code, data = json.loads(message.decode())

        if not data:
            data = {"appConfig":{},"args":[]}
        if 'appConfig' not in data:
            data['appConfig'] = {}
        if 'args' not in data:
            data['args'] = []

        self.logger.info(f'Sending PANG')
        pang_requires_data = {
            'requires': '',
            'contentType': ''
        }
        send_encoded_msg(monitoring, msg_codes.PANG, pang_requires_data)

        if code == msg_codes.PONG.value:
            self.logger.info(f'Got configuration: {data}')
            return data['appConfig'], data['args']


    async def connect_control_stream(self):
        # Control stream carries ndjson, so it's enough to split into lines.
        control_messages = (
            Stream
                # 128 kB is the typical size of TCP buffer.
                .read_from(self.streams[CC.CONTROL], chunk_size=131072)
                .decode('utf-8').split('\n').map(json.loads)
        )
        async for code, data in control_messages:
            self.logger.debug(f'Control message received: {code} {data}')
            if code == msg_codes.KILL.value:
                self.exit_immediately()
            if code == msg_codes.STOP.value:
                await self.handle_stop(data)
            if code == msg_codes.EVENT.value:
                self.emitter.emit(data['eventName'], data['message'] if 'message' in data else None)
            if code == msg_codes.MONITORING_REPLY.value:
                self.logger.debug("Monitoring reply received. Canceling reconnect")

                if self.reconnect_interval:
                    self.logger.debug("Reconnect has been set. canceling")
                    self.reconnect_interval.cancel()
                    self.reconnect_interval = None


    async def handle_stop(self, data):
        self.logger.info(f'Gracefully shutting down...{data}')
        self.keep_alive_requested = False
        timeout = data.get('timeout') / 1000
        can_keep_alive = data.get('canCallKeepalive')
        try:
            for handler in self.stop_handlers:
                await handler(timeout, can_keep_alive)
        except Exception as e:
            self.logger.error('Error stopping sequence', e)
            send_encoded_msg(self.streams[CC.MONITORING], msg_codes.SEQUENCE_STOPPED, e)

        if not can_keep_alive or not self.keep_alive_requested:
            send_encoded_msg(self.streams[CC.MONITORING], msg_codes.SEQUENCE_STOPPED, {})
            self.exit_immediately()

        await self.cleanup()


    async def setup_heartbeat(self):
        async def timeout(self):
            await asyncio.sleep(4)

            self.logger.warn("Monitoring reply not received!")
            self.connected = False

            await self.initialize()

        while self.connected:
            await asyncio.sleep(5)

            self.logger.debug(f"Sending health check {self.reconnect_interval}")

            send_encoded_msg(
                self.streams[CC.MONITORING],
                msg_codes.MONITORING,
                self.health_check(),
            )

            if self.reconnect_interval == None:
                self.reconnect_interval = asyncio.create_task(timeout(self))


    def load_sequence(self):
        # Add sequence directory to sys.path
        module_dir = os.path.dirname(self.seq_path)
        if module_dir not in sys.path:
            sys.path.append(module_dir)
        self.logger.debug(f'Loading sequence from {self.seq_path}...')
        spec = importlib.util.spec_from_file_location('sequence', self.seq_path)
        self.sequence = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.sequence)
        self.logger.info(f'Sequence loaded: {self.sequence}')
        # switch to sequence dir so that relative paths will work
        os.chdir(os.path.dirname(self.seq_path))


    async def run_instance(self, config, args):
        context = AppContext(self, config)
        self.instance_input = Stream()

        asyncio.create_task(self.connect_input_stream())

        self.logger.info('Running instance...')
        result = self.sequence.run(context, self.instance_input, *args)

        self.logger.info(f'Sending PANG')
        monitoring = self.streams[CC.MONITORING]
        produces = getattr(result, 'provides', None) or getattr(self.sequence, 'provides', None)
        if produces:
            self.logger.info(f'Sending PANG with {produces}')
            send_encoded_msg(monitoring, msg_codes.PANG, produces)

        consumes = getattr(result, 'requires', None) or getattr(self.sequence, 'requires', None)
        if consumes:
            self.logger.info(f'Sending PANG with {consumes}')
            send_encoded_msg(monitoring, msg_codes.PANG, consumes)

        if isinstance(result, types.AsyncGeneratorType):
            self.logger.info("Instance result is instance")
            result = Stream.read_from(result)
        elif asyncio.iscoroutine(result):
            self.logger.info("Instance result is coroutine")
            result = await result
        if result:
            self.logger.info("Instance result stream")
            self.instance_direct_output = result
            self.get_output_content_type()
            await self.forward_output_stream()
        else:
            self.logger.debug('Sequence returned no output.')

        self.logger.info('Finished.')
        await self.cleanup()


    async def cleanup(self):
        self.streams[CC.LOG].write_eof()

    async def get_input_content_type(self):
        if self.sequence is None:
            return

        if hasattr(self.sequence, "requires"):
            self.input_type = self.sequence.requires.get('contentType')
        else:
            raw_headers = await self.streams[CC.IN].readuntil(b'\r\n\r\n')
            header_list = raw_headers.decode().rstrip().split('\r\n')
            headers = {
                key.lower(): val for key, val in [el.split(': ') for el in header_list]
            }
            self.logger.info(f'Input headers: {repr(headers)}')
            self.input_type = headers.get('content-type')


    async def connect_input_stream(self):
        if self.input_type is None:
            await self.get_input_content_type()

        if self.input_type is None:
            return

        if self.input_type == 'text/plain':
            input = Stream.read_from(self.streams[CC.IN])
            self.logger.debug('Decoding input stream...')
            input = input.decode('utf-8')
        elif self.input_type == 'application/octet-stream':
            self.logger.debug('Opening input in binary mode...')
            input = Stream.read_from(self.streams[CC.IN], chunk_size=CHUNK_SIZE)
        else:
            raise TypeError(f'Unsupported input type: {repr(self.input_type)}')

        input.pipe(self.instance_input)
        self.logger.debug('Input stream forwarded to the instance.')


    def get_output_content_type(self):
        if self.output_content_type is None:
            if hasattr(self.instance_direct_output, 'provides'):
                attribute = getattr(self.sequence, 'provides', None)
                self.output_content_type = attribute['contentType']
            else:
                if hasattr(self.sequence, 'provides'):
                    attribute = getattr(self.sequence, 'provides', None)
                    self.output_content_type = attribute['contentType']
                else:
                    self.logger.debug('Output type not set, using default')
                    self.output_content_type = 'text/plain'

        self.logger.info(f'Content-type: {self.output_content_type}')


    async def forward_output_stream(self):
        if self.instance_direct_output is None:
            return

        if self.output_content_type == 'text/plain':
            self.logger.debug('Output stream will be treated as text and encoded')
            self.instance_output = self.instance_direct_output.map(lambda s: s.encode())
        if self.output_content_type == 'application/x-ndjson':
            self.logger.debug('Output will be converted to JSON')
            self.instance_output = self.instance_direct_output.map(lambda chunk: (json.dumps(chunk)+'\n').encode())

        await self.instance_output.write_to(self.streams[CC.OUT])


    async def send_keep_alive(self, timeout: int = 0, can_keep_alive: bool = False):
        monitoring = self.streams[CC.MONITORING]
        send_encoded_msg(monitoring, msg_codes.ALIVE)
        self.keep_alive_requested = True
        await asyncio.sleep(timeout)


    def exit_immediately(self):
        sys.exit(1)


class AppContext:
    def __init__(self, runner, config) -> None:
        self.logger = runner.logger
        self.config = config
        self.monitoring = runner.streams[CC.MONITORING]
        self.runner = runner
        self.emitter = runner.emitter

    def set_stop_handler(self, handler, *args):
        self.runner.stop_handlers.append(handler)

    def set_health_check(self, health_check):
        self.runner.health_check = health_check

    def on(self, event_name, callback):
        self.emitter.on(event_name, callback)

    def emit(self, event_name, message=''):
        send_encoded_msg(
            self.monitoring,
            msg_codes.EVENT,
            {'eventName': event_name, 'message': message}
        )

    async def keep_alive(self, timeout: int = 0):
        await self.runner.send_keep_alive(timeout)

log_target = open(sys.argv[1], 'a+') if len(sys.argv) > 1 else sys.stdout
log_setup = LoggingSetup(log_target)

log_setup.logger.info('Starting up...')
log_setup.logger.debug(f'server_host: {server_host}')
log_setup.logger.debug(f'server_port: {server_port}')
log_setup.logger.debug(f'instance_id: {instance_id}')
log_setup.logger.debug(f'sequence_path: {sequence_path}')

if not sequence_path or not server_port or not instance_id:
    log_setup.logger.error('Undefined config variable! <blows raspberry>')
    sys.exit(2)

runner = Runner(instance_id, sequence_path, log_setup)
asyncio.run(runner.main())
