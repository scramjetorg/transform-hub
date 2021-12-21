import asyncio
import sys
import os
import magic_utils
from hardcoded_magic_values import CommunicationChannels as CC
from hardcoded_magic_values import RunnerMessageCodes as msg_codes
from magic_utils import send_encoded_msg, read_and_decode

log = magic_utils.log
UGLY_DEBUG_LOGFILE = './python-runner.log'

sequence_path = os.getenv('SEQUENCE_PATH')
server_port = os.getenv('INSTANCES_SERVER_PORT')
instance_id = os.getenv('INSTANCE_ID')


async def init_connection(id, host, port):
    def is_incoming(channel):
        return channel in [CC.STDIN, CC.IN, CC.CONTROL]

    async def connect(channel):
        reader, writer = await asyncio.open_connection(host, port)
        log(f"Connected to host on port {port}")

        writer.write(id.encode())
        writer.write(channel.value.encode())
        await writer.drain()
        log(f"Sent ID {instance_id} on {channel}")

        return (channel, reader, writer)

    conn_futures = [connect(channel) for channel in CC]
    conn_data = await asyncio.gather(*conn_futures)

    # Pick read or write stream depending on channel.
    return {
        channel: reader if is_incoming(channel) else writer
        for channel, reader, writer in conn_data
    }


async def handshake(streams):
    monitoring = streams[CC.MONITORING]
    control = streams[CC.CONTROL]

    log(f"Sending PING")
    send_encoded_msg(monitoring, msg_codes.PING)

    code, data = await read_and_decode(control)
    if code == msg_codes.PONG.value:
        log(f"Got configuration: {data}")
        return data['appConfig'], data['args']


async def pretend_to_do_something(streams, args):
    for x in range(100):
        streams[CC.OUT].write(f"test {x} {''.join(args)}\n".encode())
        await asyncio.sleep(1)

    log('Finished.\n')


async def main(sequence_path, server_port, instance_id):
    log("\nConnecting to host...")
    streams = await init_connection(instance_id, 'localhost', server_port)

    config, args = await handshake(streams)
    log("Communication established.")

    await pretend_to_do_something(streams, args)


with open(UGLY_DEBUG_LOGFILE, 'a+') as magic_utils.log_file:
    log("\nStarting up...")
    log(f"sequence_path: {sequence_path}")
    log(f"server_port: {server_port}")
    log(f"instance_id: {instance_id}")

    if not sequence_path or not server_port or not instance_id:
        log("Undefined config variable! <blows raspberry>")
        sys.exit(2)

    asyncio.run(main(sequence_path, server_port, instance_id))
