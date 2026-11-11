"""Hosted Python AppContext RPC fixture."""

import asyncio
import json


async def _app(scope, receive, send):
    if scope["type"] != "http" or scope["path"] != "/add" or scope["method"] != "POST":
        await send({"type": "http.response.start", "status": 404, "headers": []})
        await send({"type": "http.response.body", "body": b""})
        return

    request_body = bytearray()
    while True:
        request = await receive()
        if request["type"] == "http.disconnect":
            return
        if request["type"] != "http.request":
            continue
        request_body.extend(request.get("body", b""))
        if not request.get("more_body", False):
            break

    payload = json.loads(request_body)
    body = json.dumps({"result": payload["a"] + payload["b"]}).encode()
    await send({
        "type": "http.response.start",
        "status": 200,
        "headers": [(b"content-type", b"application/json")],
    })
    await send({"type": "http.response.body", "body": body})


def main(context, input_stream, *args):
    context.api.use(_app)

    async def run():
        await asyncio.Event().wait()

    return run()
