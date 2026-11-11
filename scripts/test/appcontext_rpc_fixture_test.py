import asyncio
import importlib.util
import json
import pathlib
import unittest


FIXTURE_PATH = pathlib.Path(__file__).parents[2] / "bdd/data/sequences/python-bdd-appcontext-rpc-add/main.py"
SPEC = importlib.util.spec_from_file_location("appcontext_rpc_fixture", FIXTURE_PATH)
FIXTURE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(FIXTURE)


class AppContextRpcFixtureTest(unittest.IsolatedAsyncioTestCase):
    async def invoke(self, events):
        received = iter(events)
        sent = []

        async def receive():
            return next(received)

        async def send(message):
            sent.append(message)

        await FIXTURE._app({"type": "http", "path": "/add", "method": "POST"}, receive, send)
        return sent

    async def test_json_chunk_followed_by_empty_end_event(self):
        sent = await self.invoke([
            {"type": "http.request", "body": b'{"a":2,"b":3}', "more_body": True},
            {"type": "http.request", "body": b"", "more_body": False},
        ])
        self.assertEqual(sent[0]["status"], 200)
        self.assertEqual(json.loads(sent[1]["body"]), {"result": 5})

    async def test_multiple_body_chunks_are_concatenated_before_parsing(self):
        sent = await self.invoke([
            {"type": "http.request", "body": b'{"a":', "more_body": True},
            {"type": "http.request", "body": b"2,", "more_body": True},
            {"type": "http.request", "body": b'"b":3}', "more_body": False},
        ])
        self.assertEqual(sent[0]["status"], 200)
        self.assertEqual(json.loads(sent[1]["body"]), {"result": 5})

    async def test_disconnect_returns_without_sending_a_response(self):
        sent = await self.invoke([{"type": "http.disconnect"}])
        self.assertEqual(sent, [])


if __name__ == "__main__":
    unittest.main()
