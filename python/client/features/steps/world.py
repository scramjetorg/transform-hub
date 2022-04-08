import os
from host_client import HostClient
from sequence_client import SequenceClient

api_url = os.environ.get('SCRAMJET_API_URL')
host_client = HostClient(api_url)