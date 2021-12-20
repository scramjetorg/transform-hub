import asyncio
import sys
import os

sequence_path = os.getenv('SEQUENCE_PATH')
host_socket_port = os.getenv('HOST_SOCKET_PORT')
instance_id = os.getenv('INSTANCE_ID')

if not sequence_path or not host_socket_port or not instance_id:
    sys.exit(2)

address = ("localhost", host_socket_port)

with open('./py-runner-log', 'w') as log_file:
    def log(msg):
        log_file.write(msg+'\n')
        log_file.flush()

    async def connect(channel):
        host, port = address
        reader, writer = await asyncio.open_connection(host, port)
        log(f"Connected to host on port {port}")

        writer.write(instance_id.encode())
        writer.write(channel.encode())
        await writer.drain()
        log(f"Sent ID: {instance_id} and channel: {channel}")

        async for x in reader:
            log(f"Msg from host: {x.decode()}")

        log('finish\n')

    log("Starting up...")

    asyncio.run(connect("0"))
