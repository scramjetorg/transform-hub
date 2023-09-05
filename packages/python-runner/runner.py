import asyncio
import sys
import os
import codecs
import json
import logging
from pyee.asyncio import AsyncIOEventEmitter
import importlib.util
from io import DEFAULT_BUFFER_SIZE as CHUNK_SIZE
import types
from scramjet.streams import Stream
from logging_setup import LoggingSetup
from tecemux.multiplexer import Tecemux
from tecemux.hardcoded_magic_values import CommunicationChannels as CC
from tecemux.hardcoded_magic_values import RunnerMessageCodes as msg_codes


SEQUENCE_PATH = os.getenv('SEQUENCE_PATH')
SERVER_PORT = os.getenv('INSTANCES_SERVER_PORT')
SERVER_HOST = os.getenv('INSTANCES_SERVER_HOST') or 'localhost'
INSTANCE_ID = os.getenv('INSTANCE_ID')


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
        self.multiplexer = None

    async def main(self, server_host, server_port):
        asyncio.current_task().set_name('RUNNER_MAIN')
        input_stream = Stream()
        await self.init_tecemux(server_host, server_port)
        # Do this early to have access to any thrown exceptions and logs.
        self.connect_stdio()
        self.connect_log_stream()
        await self.multiplexer.sync()
        config, args = await self.handshake()
        self.logger.info('Communication established.')

        control_stream_task = asyncio.create_task(self.connect_control_stream())
        heartbeat_task = asyncio.create_task(self.setup_heartbeat())
        await self.multiplexer.sync()
        connect_input_stream_task = asyncio.create_task(self.connect_input_stream(input_stream))

        self.load_sequence()

        await self.multiplexer.sync()
        await self.run_instance(config, input_stream, args)
        await self.multiplexer.sync()

        heartbeat_task.cancel()
        control_stream_task.cancel()

        if not connect_input_stream_task.done():
            connect_input_stream_task.cancel()

        await asyncio.gather(*[heartbeat_task])
        await asyncio.gather(*[control_stream_task])
        await asyncio.gather(*[connect_input_stream_task])

        await self.multiplexer.stop()
        self.cancel_tasks()

    def cancel_tasks(self):
        [task.cancel() if task.get_name() != 'RUNNER_MAIN' else None for task in asyncio.all_tasks()]

    async def init_tecemux(self, server_host, server_port):
        self.logger.info('Connecting to host with TeceMux...')
        self.multiplexer = Tecemux(instance_id=self.instance_id)
        await self.multiplexer.connect(*await Tecemux.prepare_tcp_connection(server_host, server_port))
        await self.multiplexer.prepare(force_open=True)
        await self.multiplexer.loop()

    def connect_stdio(self):
        sys.stdout = codecs.getwriter('utf-8')(self.multiplexer.get_channel(CC.STDOUT))
        sys.stderr = StderrRedirector(codecs.getwriter('utf-8')(self.multiplexer.get_channel(CC.STDERR)))
        sys.stdin = Stream.read_from(self.multiplexer.get_channel(CC.STDIN)).decode('utf-8')

        # pretend to have API compatibiliy
        sys.stdout.flush = lambda: True
        sys.stderr.flush = lambda: True
        self.logger.info('Stdio connected.')

    def connect_log_stream(self):
        self.logger.info('Switching to main log stream...')
        log_stream = codecs.getwriter('utf-8')(self.multiplexer.get_channel(CC.LOG))
        self._logging_setup.switch_target(log_stream)
        self._logging_setup.flush_temp_handler()

        self.multiplexer.set_logger(self.logger)
        [channel._set_logger(self.logger) for channel in self.multiplexer.get_required_channels()]

        self.logger.info('Log stream connected.')

    async def handshake(self):
        monitoring = self.multiplexer.get_channel(CC.MONITORING)
        control = self.multiplexer.get_channel(CC.CONTROL)

        self.logger.info('Sending PING')
        send_encoded_msg(monitoring, msg_codes.PING)

        message = await control.readuntil(b'\n')
        self.logger.info(f'Got message: {message}')
        code, data = json.loads(message.decode())

        if not data:
            data = {"appConfig": {}, "args": []}
        if 'appConfig' not in data:
            data['appConfig'] = {}
        if 'args' not in data:
            data['args'] = []

        self.logger.info('Sending PANG')
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
            # 128 kB is the typical size of TCP buffer.
            Stream.read_from(self.multiplexer.get_channel(CC.CONTROL), chunk_size=131072)
            .decode('utf-8').split('\n').map(json.loads)
        )
        try:
            async for code, data in control_messages:
                self.logger.debug(f'Control message received: {code} {data}')
                if code == msg_codes.KILL.value:
                    await self.exit_immediately()
                if code == msg_codes.STOP.value:
                    await self.handle_stop(data)
                if code == msg_codes.EVENT.value:
                    self.emitter.emit(data['eventName'], data['message'] if 'message' in data else None)

        except asyncio.CancelledError:
            task = self.multiplexer.get_channel(CC.CONTROL)._outcoming_process_task
            task.cancel()
            await asyncio.sleep(0)
            await asyncio.gather(*[task])
            return

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
            send_encoded_msg(self.multiplexer.get_channel(CC.MONITORING), msg_codes.SEQUENCE_STOPPED, e)

        if not can_keep_alive or not self.keep_alive_requested:
            send_encoded_msg(self.multiplexer.get_channel(CC.MONITORING), msg_codes.SEQUENCE_STOPPED, {})
            await self.exit_immediately()

    async def setup_heartbeat(self):
        while True:
            try:
                send_encoded_msg(
                    self.multiplexer.get_channel(CC.MONITORING),
                    msg_codes.MONITORING,
                    self.health_check(),
                )
                await self.multiplexer.get_channel(CC.MONITORING).sync()
                await asyncio.sleep(1)
            except asyncio.CancelledError:
                await self.multiplexer.get_channel(CC.MONITORING).sync()
                return

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

    async def run_instance(self, config, input, args):
        context = AppContext(self, config)
        self.logger.info('Running instance...')
        try:
            result = self.sequence.run(context, input, *args)
        except Exception:
            import traceback
            self.multiplexer.get_channel(CC.STDERR).write(traceback.format_exc())
            await self.multiplexer.sync()
            await self.exit_immediately()

        self.logger.info('Sending PANG')

        monitoring = self.multiplexer.get_channel(CC.MONITORING)

        produces = getattr(result, 'provides', None) or getattr(self.sequence, 'provides', None)
        if produces:
            self.logger.info(f'Sending PANG with {produces}')
            send_encoded_msg(monitoring, msg_codes.PANG, produces)

        consumes = getattr(result, 'requires', None) or getattr(self.sequence, 'requires', None)
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

    async def connect_input_stream(self, input_stream):
        try:
            if hasattr(self.sequence, "requires"):
                input_type = self.sequence.requires.get('contentType')
            else:
                raw_headers = await self.multiplexer.get_channel(CC.IN).readuntil(b'\r\n\r\n')
                header_list = raw_headers.decode().rstrip().split('\r\n')
                headers = {
                    key.lower(): val for key, val in [el.split(': ') for el in header_list]
                }
                self.logger.info(f'Input headers: {repr(headers)}')
                input_type = headers.get('content-type')

            if input_type == 'text/plain':
                input = Stream.read_from(self.multiplexer.get_channel(CC.IN))

                self.logger.debug('Decoding input stream...')
                input = input.decode('utf-8')
            elif input_type == 'application/octet-stream':
                self.logger.debug('Opening input in binary mode...')
                input = Stream.read_from(self.multiplexer.get_channel(CC.IN), chunk_size=CHUNK_SIZE)

            else:
                raise TypeError(f'Unsupported input type: {repr(input_type)}')

            input.pipe(input_stream)
            self.logger.debug('Input stream forwarded to the instance.')
        except asyncio.CancelledError:
            task = self.multiplexer.get_channel(CC.IN)._outcoming_process_task
            task.cancel()
            await asyncio.sleep(0)
            await asyncio.gather(*[task])
            return

    async def forward_output_stream(self, output):

        if hasattr(output, 'provides'):
            attribute = getattr(self.sequence, 'provides', None)
            content_type = attribute['contentType']
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
            output = output.map(lambda chunk: (json.dumps(chunk) + '\n').encode())

        await output.write_to(self.multiplexer.get_channel(CC.OUT))

    async def send_keep_alive(self, timeout: int = 0, can_keep_alive: bool = False):
        monitoring = self.multiplexer.get_channel(CC.MONITORING)
        send_encoded_msg(monitoring, msg_codes.ALIVE)
        self.keep_alive_requested = True
        await asyncio.sleep(timeout)

    async def exit_immediately(self):
        await self.multiplexer.sync()
        sys.exit(1)


class AppContext:
    def __init__(self, runner, config) -> None:
        self.logger = runner.logger
        self.config = config
        self.monitoring = runner.protocol.get_channel(CC.MONITORING)
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


LOG_TARGET = open(sys.argv[1], 'a+', encoding='utf-8') if len(sys.argv) > 1 else sys.stdout
LOG_SETUP = LoggingSetup(LOG_TARGET, min_loglevel=logging.DEBUG)

LOG_SETUP.logger.info('Starting up...')
LOG_SETUP.logger.debug(f'server_host: {SERVER_HOST}')
LOG_SETUP.logger.debug(f'server_port: {SERVER_PORT}')
LOG_SETUP.logger.debug(f'instance_id: {INSTANCE_ID}')
LOG_SETUP.logger.debug(f'sequence_path: {SEQUENCE_PATH}')

if not SEQUENCE_PATH or not SERVER_PORT or not INSTANCE_ID:
    LOG_SETUP.logger.error('Undefined config variable! <blows raspberry>')
    sys.exit(2)

runner = Runner(INSTANCE_ID, SEQUENCE_PATH, LOG_SETUP)
asyncio.run(runner.main(SERVER_HOST, SERVER_PORT))
