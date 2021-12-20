import asyncio
import sys
import os
import json

sequence_path = os.getenv('SEQUENCE_PATH')
host_socket_port = os.getenv('INSTANCES_SERVER_PORT')
instance_id = os.getenv('INSTANCE_ID')

if not sequence_path or not host_socket_port or not instance_id:
    sys.exit(2)

address = ("localhost", host_socket_port)

with open('./py-runner-log', 'w') as log_file:
    def log(msg):
        log_file.write(msg+'\n')
        log_file.flush()

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

    log("Starting up...")

    async def connect():
        channels = [
            open_one_channel(ch)
            for ch
            in ["0", "1", "2", "3", "4", "5", "6", "7"]
        ]
        await asyncio.gather(*channels)

    asyncio.run(connect())
