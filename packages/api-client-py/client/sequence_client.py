from client.host_client import HostClient
from client.instance_client import InstanceClient

class SequenceClient:
    def __init__(self, id: str, host: HostClient) -> None:
        self.id = id
        self.host = host
        self.sequence_url = f'/sequence/{id}'
    
    async def start(self) -> str:
        url = f'{self.sequence_url}/start'
        headers = {'Content-Type': 'application/json'}
        return await self.host.post(url, headers=headers, data={})
    
    async def list_instances(self) -> str:
        url = f'{self.sequence_url}/instances'
        return await self.host.get(url)

    async def get_instance(id: str, host: HostClient) -> InstanceClient:
        return InstanceClient(id, host)

    async def get_info(self) -> str:
        url = f'{self.sequence_url}'
        return await self.host.get(url)
