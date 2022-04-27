import aiohttp
from urllib.parse import urlparse

class HostClient:
    def __init__(self, url: str) -> None:
        self.url = urlparse(url)

    async def get(self, url: str) -> str:
        async with aiohttp.ClientSession() as session:
            url = f'{self.url.geturl()}{url}'
            async with session.get(url) as resp:
                return await resp.text()
    
    async def post(self, url: str, headers: str = None, data=None, config=None) -> str:
        async with aiohttp.ClientSession() as session:
            url = f'{self.url.geturl()}{url}'
            async with session.post(url, headers=headers, data=data, params=config) as resp:
                return await resp.text()
    
    async def delete(self, url: str, headers: str = None) -> str:
        async with aiohttp.ClientSession() as session:
            url = f'{self.url.geturl()}{url}'
            async with session.delete(url, headers=headers) as resp:
                return await resp.text()
    
    async def get_data(self, seq_path: str) -> bytes:
        with open(seq_path, 'rb') as f:
            return f.read()
    
    async def send_stream(self, url: str, stream: str, options: dict):
        headers = {
            'content-type': options.get('type'),
            'x-end-stream': options.get('end')
        }
        config = { 'parse': options.get('parse_response') }
        return await self.post(url, headers, stream, config)
 
    async def list_sequences(self) -> str:
        url = f'/sequences'
        return await self.get(url)
    
    async def list_instances(self) -> str:
        url = f'/instances'
        return await self.get(url)

    async def send_sequence(self, file, app_config = None) -> str:
        url = f'/sequence'
        data = await self.get_data(file)
        return await self.post(url, data=data)

    async def get_sequence(self, id: str) -> str:
        url = f'/sequence/{id}'
        return await self.get(url)

    async def delete_sequence(self, id: str) -> str:
        url = f'/sequence/{id}'
        headers = {'Content-Type': 'application/json'}
        return await self.delete(url, headers=headers)

    async def get_instance_info(self, id: str) -> str:
        url = f'/instance/{id}'
        return await self.get(url)

    async def get_load_check(self) -> str:
        url = f'/load-check'
        return await self.get(url)

    async def get_version(self) -> str:
        url = f'/version'
        return await self.get(url)
   
    async def get_log_stream(self) -> str:
        url = f'/log'
        return await self.get(url)

    async def send_named_data(self, topic: str, stream: str, content_type: str, end: bool):
        data = {'type': content_type, 'end': end, 'parse_response': 'stream'}
        return await self.send_stream(f'topic/{topic}', stream, options=data)

    async def get_named_data(self, topic: str):
        return await self.get(f'topic/{topic}')
