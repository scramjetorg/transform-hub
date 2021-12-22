import json

def send_encoded_msg(stream, msg_code, data={}):
    message = json.dumps([msg_code.value, data])
    stream.write(f"{message}\r\n".encode())

async def read_and_decode(stream, size=1024):
    bytes = await stream.read(size)
    return json.loads(bytes.decode())
