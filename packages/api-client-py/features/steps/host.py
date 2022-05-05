from behave import *

from world import api_url, host_client as host
from client.sequence_client import SequenceClient

import asyncio
import json

@given('host is running')
def step_impl(context):
    context.host = host
    response = asyncio.run(context.host.get_load_check())
    assert context.failed is False

@when('asked for version')
def step_impl(context):
    response = asyncio.run(context.host.get_version())
    context.results = json.loads(response)

@when('asked for instances')
def step_impl(context):
    context.results = asyncio.run(host.list_instances())

@when('asked for sequences')
def step_impl(context):
    context.results = asyncio.run(host.list_sequences())

@when('sequence {path} loaded')
def step_impl(context, path):
    response = asyncio.run(host.send_sequence(path))
    context.results = json.loads(response)

@when('{seq_id} sequence removed')
def step_impl(context, seq_id):
    if seq_id == '-':
        seq_id = context.results.get('id')
    context.results = asyncio.run(host.delete_sequence(seq_id))

@when('{seq_id} sequence get')
def step_impl(context, seq_id):
    if seq_id == '-':
        seq_id = context.results.get('id')
    context.results = asyncio.run(host.get_sequence(seq_id))

@when('sequence started')
def step_impl(context):
    seq_id = context.results.get('id')
    seq_client = SequenceClient(seq_id, host)
    context.results = asyncio.run(seq_client.start())
    assert(context)

@then('is showing {instances}')
def step_impl(context, instances: str):
    assert(context.results == instances)

@then('returns response with {key} == {value}')
def step_impl(context, key: str, value: str):
    data = json.loads(context.results)
    assert(data.get(key) == value)

@then('returns response with {key}')
def step_impl(context, key: str):
    assert(key in context.results)

@then('host is still running')
def step_impl(context):
    context.host = host
    response = asyncio.run(context.host.get_load_check())
    assert context.failed is False