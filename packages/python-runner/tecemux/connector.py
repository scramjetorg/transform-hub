import aiohttp


class Connector(aiohttp.BaseConnector):
    """Custom connector class so that the Tecemux can be used in aiohttp requests.
    """
    def __init__(self, tecemux: "Tecemux"):
        self.tecemux = tecemux
        super().__init__()

    async def _create_connection(self, req, traces, timeout) -> "ChannelContext":
        # TODO: adjust duplex_channel to be an equivalent to aiohttp's 'ResponseHandler'
        channel = await self.tecemux.open_channel(force_open=True)
        channel_name = channel._channel_enum
        await self.tecemux.sync()
        duplex_channel = self.tecemux.get_channel(channel_name)
        return duplex_channel  # should be an equivalent to aiohttp's 'ResponseHandler'

