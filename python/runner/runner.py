import asyncio
import sys
import os
import codecs
import json
import importlib.util
from io import DEFAULT_BUFFER_SIZE as CHUNK_SIZE
from scramjet.streams import Stream
from logging_setup import LoggingSetup
from hardcoded_magic_values import CommunicationChannels as CC
from hardcoded_magic_values import RunnerMessageCodes as msg_codes

STARTUP_LOGFILE = './python-runner-startup.log'

sequence_path = os.getenv('SEQUENCE_PATH')
server_port = os.getenv('INSTANCES_SERVER_PORT')
instance_id = os.getenv('INSTANCE_ID')

def send_encoded_msg(stream, msg_code, data={}):
    message = json.dumps([msg_code.value, data])
    stream.write(f"{message}\r\n".encode())


class Runner:
    def __init__(self, instance_id, sequence_path, log_setup) -> None:
        self.instance_id = instance_id
        self.seq_path = sequence_path
        self._logging_setup = log_setup
        self.logger = log_setup.logger
        self.stop_handler = None
        self.health_check = lambda: {'healthy': True}


    async def main(self, server_host, server_port):
        self.logger.info("Connecting to host...")
        await self.init_connections(server_host, server_port)

        # Do this early to have access to any thrown exceptions and logs.
        self.connect_stdio()
        self.connect_log_stream()

        config, args = await self.handshake()
        self.logger.info("Communication established.")
        asyncio.create_task(self.connect_control_stream())
        asyncio.create_task(self.setup_heartbeat())

        self.load_sequence()
        await self.run_instance(config, args)


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
        self.logger.info("Stdio connected.")


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

        message = await control.readuntil(b"\n")
        self.logger.info(f"Got message: {message}")
        code, data = json.loads(message.decode())

        self.logger.info(f"Sending PANG")
        pang_requires_data = {
            'requires': '',
            'contentType': ''
        }
        send_encoded_msg(monitoring, msg_codes.PANG, pang_requires_data)

        if code == msg_codes.PONG.value:
            self.logger.info(f"Got configuration: {data}")
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
            self.logger.debug(f"Control message received: {code} {data}")
            if code == msg_codes.KILL.value:
                self.exit_immediately()
            if code == msg_codes.STOP.value:
                await self.handle_stop(data)


    async def handle_stop(self, data):
        stop = self.stop_handler()
        if asyncio.iscoroutine(stop):
            await stop
        # TODO: add canCallKeppAlive feature, asyncio.wait?
        # canCallKeepAlive = data.get('canCallKeppalive')
        self.logger.info(f"Gracefully shutting down...{data}")
        try:
            timeout = data.get('timeout') / 1000
            await asyncio.sleep(timeout)
            send_encoded_msg(self.streams[CC.MONITORING], msg_codes.SEQUENCE_STOPPED, {})
            self.exit_immediately()
        except Exception as e:
            self.logger.error("Error stopping sequence", e)
            send_encoded_msg(self.streams[CC.MONITORING], msg_codes.SEQUENCE_STOPPED, e)


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
        self.logger.debug(f"Loading sequence from {self.seq_path}...")
        spec = importlib.util.spec_from_file_location("sequence", self.seq_path)
        self.sequence = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.sequence)
        self.logger.info(f"Sequence loaded: {self.sequence}")
        # switch to sequence dir so that relative paths will work
        os.chdir(os.path.dirname(self.seq_path))


    async def run_instance(self, config, args):
        context = AppContext(self, config)
        input_stream = Stream()
        asyncio.create_task(self.connect_input_stream(input_stream))

        self.logger.info("Running instance...")
        result = self.sequence.run(context, input_stream, *args)

        self.logger.info(f"Sending PANG")
        monitoring = self.streams[CC.MONITORING]
        pang_provides_data = {
            'provides': '',
            'contentType': ''
        }
        send_encoded_msg(monitoring, msg_codes.PANG, pang_provides_data)

        if asyncio.iscoroutine(result):
            result = await result
        if result:
            await self.forward_output_stream(result)
        else:
            self.logger.debug("Sequence returned no output.")

        self.logger.info('Finished.')


    async def connect_input_stream(self, input_stream):
        raw_headers = await self.streams[CC.IN].readuntil(b"\r\n\r\n")
        header_list = raw_headers.decode().rstrip().split("\r\n")
        headers = {
            key.lower(): val for key, val in [el.split(": ") for el in header_list]
        }
        self.logger.info(f"Input headers: {repr(headers)}")

        input_type = headers['content-type']
        if input_type == "text/plain":
            input = Stream.read_from(self.streams[CC.IN])
            self.logger.debug("Decoding input stream...")
            input = input.decode("utf-8")
        elif input_type == "application/octet-stream":
            self.logger.debug("Opening input in binary mode...")
            input = Stream.read_from(self.streams[CC.IN], chunk_size=CHUNK_SIZE)
        else:
            raise TypeError(f"Unsupported input type: {repr(input_type)}")

        input.pipe(input_stream)
        self.logger.debug("Input stream forwarded to the instance.")


    async def forward_output_stream(self, output):
        try:
            output_type = self.sequence.output_type
        except AttributeError:
            self.logger.debug("Output type not set, using default")
            output_type = "text/plain"
        self.logger.info(f"Output type: {output_type}")

        if output_type == "text/plain":
            self.logger.debug("Output stream will be treated as text and encoded")
            output = output.map(lambda s: s.encode())
        if output_type == "application/x-ndjson":
            self.logger.debug("Output will be converted to JSON")
            output = output.map(lambda chunk: (json.dumps(chunk)+'\n').encode())

        await output.write_to(self.streams[CC.OUT])


    def exit_immediately(self):
        sys.exit(1)


class AppContext:
    def __init__(self, runner, config) -> None:
        self.logger = runner.logger
        self.config = config
        self.monitoring = runner.streams[CC.MONITORING]
        self.runner = runner

    def set_stop_handler(self, handler):
        self.runner.stop_handler = handler

    def set_health_check(self, health_check):
        self.runner.health_check = health_check


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
