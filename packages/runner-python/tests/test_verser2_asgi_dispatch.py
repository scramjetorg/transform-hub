from __future__ import annotations

# pyright: reportMissingImports=false

import pytest

from verser2_guest_python.asgi import build_http_scope, dispatch_asgi_request


def test_build_http_scope_normalizes_asgi_3_request_metadata() -> None:
    scope = build_http_scope({
        "method": "post",
        "path": "/hello%20world?x=1",
        "headers": {"content-type": "text/plain", "x-test": "ok"},
    })

    assert scope["type"] == "http"
    assert scope["asgi"] == {"version": "3.0", "spec_version": "2.5"}
    assert scope["method"] == "POST"
    assert scope["path"] == "/hello world"
    assert scope["raw_path"] == b"/hello%20world"
    assert scope["query_string"] == b"x=1"
    assert (b"content-type", b"text/plain") in scope["headers"]
    assert (b"x-test", b"ok") in scope["headers"]


@pytest.mark.asyncio
async def test_dispatch_asgi_request_delivers_one_shot_body() -> None:
    received = []

    async def app(scope, receive, send):
        received.append((scope["method"], await receive(), await receive()))
        await send({"type": "http.response.start", "status": 201, "headers": [(b"x-seen", b"yes")]})
        await send({"type": "http.response.body", "body": b"created"})

    response = await dispatch_asgi_request(
        app,
        "runner.inst.guest",
        {"requestId": "req-1", "method": "PUT", "path": "/items"},
        b"payload",
    )

    assert received == [(
        "PUT",
        {"type": "http.request", "body": b"payload", "more_body": False},
        {"type": "http.request", "body": b"", "more_body": False},
    )]
    assert response.request_id == "req-1"
    assert response.status_code == 201
    assert response.headers == {"x-seen": "yes"}
    assert response.body == b"created"
    assert response.error is None


@pytest.mark.asyncio
async def test_dispatch_asgi_request_preserves_streamed_request_and_response_bodies() -> None:
    seen_bodies = []

    async def app(_scope, receive, send):
        while True:
            event = await receive()
            seen_bodies.append((event["body"], event["more_body"]))
            if not event["more_body"]:
                break
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"part-1"})
        await send({"type": "http.response.body", "body": b"part-2"})

    response = await dispatch_asgi_request(
        app,
        "runner.inst.guest",
        {"requestId": "req-2", "method": "POST", "path": "/stream"},
        [b"one", b"two", b"three"],
    )

    assert seen_bodies == [(b"one", True), (b"two", True), (b"three", False)]
    assert response.status_code == 200
    assert response.body == b"part-1part-2"


@pytest.mark.asyncio
async def test_dispatch_asgi_request_returns_error_before_response_start() -> None:
    async def app(_scope, _receive, _send):
        raise RuntimeError("boom")

    response = await dispatch_asgi_request(
        app,
        "runner.inst.guest",
        {"requestId": "req-3", "method": "GET", "path": "/fail"},
        b"",
    )

    assert response.status_code is None
    assert response.error is not None
    assert response.error["code"] == "local-handler-failure"
    assert response.error["context"] == {
        "guestId": "runner.inst.guest",
        "requestId": "req-3",
        "path": "/fail",
    }
