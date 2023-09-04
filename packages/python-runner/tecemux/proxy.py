""" proxy.py - contains Tecemux HTTP proxy to connect with 3rd party Python packages
"""

import asyncio
import base64
import socket


class HTTPProxy:
    """ Simple HTTP proxy implementation for internal usage by Tecemux procotol
    """

    def __init__(self):
        """Initialize HTTP proxy
        """

        self._host = '127.0.0.1'
        self._proxy_socket = None
        self._port = None

    @staticmethod
    def _get_headers_as_dict(request_headers, convert_keys_to_lowercase=False):
        headers_list = request_headers.decode().strip().split('\r\n')

        return {(key.strip().lower() if convert_keys_to_lowercase
                else key.strip()): val.strip() for key, val in [el.split(': ') for el in headers_list]}

    @staticmethod
    def _extract_tecemux_details(request_headers):

        headers = HTTPProxy._get_headers_as_dict(request_headers)

        tecemux_params = base64.b64decode(headers['Proxy-Authorization'].split(' ')[1]).decode().split(':')

        del headers['Proxy-Authorization']

        new_headers = ('\r\n'.join(key + ': ' + str(val) for key, val in headers.items()) + '\r\n\r\n').encode('utf-8')

        return type('TecemuxDetails', (object,), {'user': tecemux_params[0],
                                                  'channel_id': tecemux_params[1]})(), new_headers

    @staticmethod
    async def handle_request(reader, writer, multiplexer):
        """Process single request to server

        Args:
            reader (asyncio.StreamReader): Stream reader provides access to HTTP request data
            writer (asyncio.StreamWriter): Stream writer give posibility to send response
            multiplexer (Tecemux): Tecemux object
        """

        request_status = await reader.readuntil(b'\r\n')

        tecemux_params, request_headers = HTTPProxy._extract_tecemux_details(await reader.readuntil(b'\r\n\r\n'))

        channel = multiplexer.get_channel(tecemux_params.channel_id)

        channel.write(request_status)
        channel.write(request_headers)

        raw_response_status = await channel.readuntil(b'\r\n')
        writer.write(raw_response_status)

        raw_response_headers = await channel.readuntil(b'\r\n\r\n')
        writer.write(raw_response_headers)

        headers = HTTPProxy._get_headers_as_dict(raw_response_headers, convert_keys_to_lowercase=True)

        raw_response_data = await channel.read(int(headers['content-length']))
        writer.write(raw_response_data)

        writer.write(b'\r\n')
        await writer.drain()

    async def run(self, multiplexer):
        """Starts server on random local TCP port

        Args:
            multiplexer (Tecemux): Tecemux object
        """

        self._proxy_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._proxy_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._proxy_socket.bind((self._host, 0))
        self._proxy_socket.listen()

        self._port = int(self._proxy_socket.getsockname()[1])

        server = await asyncio.start_server(lambda r, w: HTTPProxy.handle_request(r, w, multiplexer),
                                            sock=self._proxy_socket)

        async with server:
            await server.serve_forever()

        self._proxy_socket.close()

    def get_proxy_uri(self):
        """Returns proxy config URI for aiohttp

        Returns:
            str: aiohttp proxy config
        """

        return f'http://{self._host}:{self._port}'
