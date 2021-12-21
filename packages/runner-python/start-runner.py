import asyncio
import sys
import os
import json
from pprint import pprint
from hardcoded_magic_values import CommunicationChannels as CC

sequence_path = os.getenv('SEQUENCE_PATH')
server_port = os.getenv('INSTANCES_SERVER_PORT')
instance_id = os.getenv('INSTANCE_ID')

UGLY_DEBUG_LOGFILE = './python-runner.log'

log_file = None  # see end of file.

def log(msg):
    log_file.write(f"{msg}\n")
    log_file.flush()


def splash_screen():
    log("\nStarting up...")
    log(f"sequence_path: {sequence_path}")
    log(f"server_port: {server_port}")
    log(f"instance_id: {instance_id}")

    if not sequence_path or not server_port or not instance_id:
        log("Undefined config variable! <blows raspberry>")
        sys.exit(2)


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
    ping = json.dumps([3000, {}])
    monitoring.write(f"{ping}\r\n".encode())

    pong = await control.read(1000)
    log(f"Got PONG: {pong}")
    return pong


async def pretend_to_do_something(streams):
    for x in range(50):
        streams[CC.OUT].write(f"test {x}\n".encode())
        await asyncio.sleep(1)
        
    log('Finished.\n')


async def main():
    splash_screen()

    log("\nConnecting to host...")
    streams = await init_connection(instance_id, 'localhost', server_port)

    await handshake(streams)
    log("Communication established.")

    await pretend_to_do_something(streams)


with open(UGLY_DEBUG_LOGFILE, 'a+') as log_file:
    asyncio.run(main())
