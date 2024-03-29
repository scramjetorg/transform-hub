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
        self.instance_id = instance_id
        self.seq_path = sequence_path
        self._logging_setup = log_setup
        self.logger = log_setup.logger
        self.stop_handlers = []
        self.health_check = lambda: {'healthy': True}
        self.emitter = AsyncIOEventEmitter()
        self.keep_alive_requested = False


    async def main(self, server_host, server_port):
        self.logger.info('Connecting to host...')
        await self.init_connections(server_host, server_port)

        # Do this early to have access to any thrown exceptions and logs.
        self.connect_stdio()
        self.connect_log_stream()

        config, args = await self.handshake()
        self.logger.info('Communication established.')
        asyncio.create_task(self.connect_control_stream())
        asyncio.create_task(self.setup_heartbeat())

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
        self._logging_setup.switch_target(log_stream)
        self._logging_setup.flush_temp_handler()
        self.logger.info('Log stream connected.')


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
        while True:
            send_encoded_msg(
                self.streams[CC.MONITORING],
                msg_codes.MONITORING,
                self.health_check(),
            )
            await asyncio.sleep(1)


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
        input_stream = Stream()
        asyncio.create_task(self.connect_input_stream(input_stream))

        self.logger.info('Running instance...')
        result = self.sequence.run(context, input_stream, *args)

        self.logger.info(f'Sending PANG')
        monitoring = self.streams[CC.MONITORING]

        # Sending Topics producer information to STH
        produces_runtime = getattr(result, 'provides', None)

        if produces_runtime == None: 
            produces = getattr(self.sequence, 'provides', None)
        else:
            produces = {}
            produces['provides'] = produces_runtime
            produces['contentType'] = getattr(result, 'content_type', None)
            produces_json = json.dumps(produces) 

        if produces:
            self.logger.info(f'Sending PANG with {produces}')
            send_encoded_msg(monitoring, msg_codes.PANG, produces)

        # Sending Topics consumer information to STH
        consumes_runtime = getattr(result, 'requires', None)

        if consumes_runtime == None: 
            consumes = getattr(self.sequence, 'requires', None)
        else:
            consumes = {}
            consumes['requires'] = consumes_runtime
            consumes['contentType'] = getattr(result, 'content_type', None)
            consumes_json = json.dumps(consumes) 

        if consumes:
            self.logger.info(f'Sending PANG with {consumes}')
            send_encoded_msg(monitoring, msg_codes.PANG, consumes)

        if isinstance(result, types.AsyncGeneratorType):
            result = Stream.read_from(result)
        elif asyncio.iscoroutine(result):
            result = await result
        if result:
            await self.forward_output_stream(result)
        else:
            self.logger.debug('Sequence returned no output.')

        self.logger.info('Finished.')
        await self.cleanup()

    async def cleanup(self):
        self.streams[CC.LOG].write_eof()

    async def connect_input_stream(self, input_stream):
        if hasattr(self.sequence, "requires"):
            input_type = self.sequence.requires.get('contentType')
        else:
            raw_headers = await self.streams[CC.IN].readuntil(b'\r\n\r\n')
            header_list = raw_headers.decode().rstrip().split('\r\n')
            headers = {
                key.lower(): val for key, val in [el.split(': ') for el in header_list]
            }
            self.logger.info(f'Input headers: {repr(headers)}')
            input_type = headers.get('content-type')

        if input_type == 'text/plain':
            input = Stream.read_from(self.streams[CC.IN])
            self.logger.debug('Decoding input stream...')
            input = input.decode('utf-8')
        elif input_type == 'application/octet-stream':
            self.logger.debug('Opening input in binary mode...')
            input = Stream.read_from(self.streams[CC.IN], chunk_size=CHUNK_SIZE)
        else:
            raise TypeError(f'Unsupported input type: {repr(input_type)}')

        input.pipe(input_stream)
        self.logger.debug('Input stream forwarded to the instance.')


    async def forward_output_stream(self, output):

        if hasattr(output, 'provides'):
            attribute = getattr(output, 'provides', None)
            content_type = getattr(output, 'content_type', None)

        else:
            if hasattr(self.sequence, 'provides'):
                attribute = getattr(self.sequence, 'provides', None)
                content_type = attribute['contentType']
            else:
                self.logger.debug('Output type not set, using default')
                content_type = 'text/plain'

        self.logger.info(f'Content-type: {content_type}')
        if content_type == 'text/plain':
            self.logger.debug('Output stream will be treated as text and encoded')
            output = output.map(lambda s: s.encode())
        if content_type == 'application/x-ndjson':
            self.logger.debug('Output will be converted to JSON')
            output = output.map(lambda chunk: (json.dumps(chunk)+'\n').encode())

        await output.write_to(self.streams[CC.OUT])


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
asyncio.run(runner.main(server_host, server_port))
