import asyncio
import pytest

class TestProxy:

    async def _close_clients(self, a, b):
        await a.stop()
        await b.stop()

    
    @pytest.mark.asyncio
    async def test_extra_channel_with_proxy(self, local_socket_connection):
        client_a, client_b = local_socket_connection 

        async def _wait_for_channel(client_b):
            while True: 
                if len(client_b._extra_channels) > 0:
                    opened_channel_name = list(client_b._extra_channels.keys())[0]
                    channel = client_b.get_channel(opened_channel_name)
                    _ = await channel.readuntil(b'\r\n\r\n')
                    await asyncio.sleep(0.5)
                    channel.write(b'HTTP/1.1 200 OK\r\nContent-Length: 12\r\nContent-Type: text/html\r\n\r\nHello World!\r\n')
                    await client_b.sync()
                    break
                await asyncio.sleep(0)
        
        task = asyncio.create_task(_wait_for_channel(client_b))

        import aiohttp

        async with aiohttp.ClientSession() as session:        
            async with session.get("http://_/api/version", proxy=client_a.get_proxy_uri()) as resp:
                data = await resp.text()
        
        await asyncio.gather(task)

        assert data == 'Hello World!'
        await self._close_clients(client_a, client_b)