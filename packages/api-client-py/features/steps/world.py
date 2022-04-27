import os
from host_client import HostClient
from sequence_client import SequenceClient

DEFAULT_VALUE = "http://localhost:8000/api/v1"
api_url = os.environ.get('LOCAL_HOST_BASE_URL') or DEFAULT_VALUE
host_client = HostClient(api_url)
