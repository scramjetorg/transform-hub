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


async def handshake():
    pass


async def plaskay(channel):
    if channel == "4":
        log(f"Sending PINK")
        pink = json.dumps([3000, {}])
        writer.write(f"{pink}\r\n".encode())

    if channel == "6":
        await asyncio.sleep(1)
        for x in range(20):
            writer.write(f"{x} mlask".encode())
            await asyncio.sleep(1)

    else:
        async for x in reader:
            log(f"Msg from host: {x.decode()}")

    log('finish\n')


async def main():
    splash_screen()

    log("\nConnecting to host...")
    streams = await init_connection(instance_id, 'localhost', server_port)
    log("Communication channels established.")

    monwriter = streams[CC.MONITORING]
    ctrlreader = streams[CC.CONTROL]

    log(f"Sending PINK")
    pink = json.dumps([3000, {}])
    monwriter.write(f"{pink}\r\n".encode())

    async for x in ctrlreader:
        log(f"Msg from host: {x.decode()}")


with open(UGLY_DEBUG_LOGFILE, 'a+') as log_file:
    asyncio.run(main())
