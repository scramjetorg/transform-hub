import asyncio
import sys
import os
import json
from hardcoded_magic_values import CommunicationChannels as CC

sequence_path = os.getenv('SEQUENCE_PATH')
server_port = os.getenv('INSTANCES_SERVER_PORT')
instance_id = os.getenv('INSTANCE_ID')

UGLY_LOCAL_LOGFILE = './python-runner.log'

with open(UGLY_LOCAL_LOGFILE, 'a+') as log_file:
    def log(msg):
        log_file.write(msg+'\n')
        log_file.flush()

    log(f"sequence_path: {sequence_path}")
    log(f"server_port: {server_port}")
    log(f"instance_id: {instance_id}")

    if not sequence_path or not server_port or not instance_id:
        log("Undefined config variable! Aborting. <blows raspberry>")
        sys.exit(2)

    log("\nStarting up...")

    address = ("localhost", server_port)
    connections = {}


    async def init(id, host, port):

        async def connect(channel):
            reader, writer = await asyncio.open_connection(host, port)
            log(f"Connected to host on port {port}")

            writer.write(id.encode())
            writer.write(channel.value.encode())
            log(f"Sent ID {instance_id} on {channel}")

            await writer.drain()
            return reader, writer

        channels = [connect(ch) for ch in CC]
        log(f"channels: {channels}")
        return await asyncio.gather(*channels)

    streams = asyncio.run(init(instance_id, 'localhost', server_port))
    log(f"streams: {streams}")

    async def mlaskaj(channel):
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

