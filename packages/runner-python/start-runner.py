import asyncio
import sys
import os
import json

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

    log("Starting up...")

    address = ("localhost", server_port)


    async def open_one_channel(channel):
        host, port = address
        reader, writer = await asyncio.open_connection(host, port)
        log(f"Connected to host on port {port}")

        writer.write(instance_id.encode())
        writer.write(channel.encode())
        await writer.drain()
        log(f"Sent ID: {instance_id} and channel: {channel}")
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


    async def connect():
        channels = [
            open_one_channel(ch)
            for ch
            in ["0", "1", "2", "3", "4", "5", "6", "7"]
        ]
        await asyncio.gather(*channels)

    asyncio.run(connect())
