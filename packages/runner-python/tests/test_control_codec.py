from __future__ import annotations

# pyright: reportMissingImports=false

import logging

from runner_python.control_codec import ControlFrameDecoder, decode_control_frames


def test_decode_single_complete_frame() -> None:
    frames = list(decode_control_frames(b'[4000, {"key":"value"}]\r\n'))

    assert frames == [(4000, {"key": "value"})]


def test_decode_multiple_frames_from_one_buffer() -> None:
    frames = list(decode_control_frames(b'[1,"a"]\r\n[2,"b"]\r\n'))

    assert frames == [(1, "a"), (2, "b")]


def test_partial_frame_yields_no_output_until_crlf_arrives() -> None:
    decoder = ControlFrameDecoder()

    assert list(decoder.decode_control_frames(b'[4000,{"key":"va')) == []
    assert list(decoder.decode_control_frames(b'lue"}]\r\n')) == [(4000, {"key": "value"})]


def test_malformed_json_is_logged_and_skipped_while_decoding_continues(caplog) -> None:
    decoder = ControlFrameDecoder()
    caplog.set_level(logging.WARNING)

    frames = list(decoder.decode_control_frames(b'not json\r\n[2,"ok"]\r\n'))

    assert frames == [(2, "ok")]
    assert len(caplog.records) == 1
    assert caplog.records[0].levelno == logging.WARNING
    assert caplog.records[0].message == "Skipping malformed control frame"
    assert caplog.records[0].frame == "not json"
    assert "Expecting value" in caplog.records[0].error


def test_empty_payload_null_is_accepted() -> None:
    frames = list(decode_control_frames(b'[4000,null]\r\n'))

    assert frames == [(4000, None)]


def test_unknown_code_passes_through_unchanged() -> None:
    frames = list(decode_control_frames(b'[987654,{"raw":true}]\r\n'))

    assert frames == [(987654, {"raw": True})]


def test_decoder_accepts_node_emitted_bytes_byte_for_byte() -> None:
    payload = {"id": "abc", "ok": True, "count": 3}
    frame = b'[4000,{"id":"abc","ok":true,"count":3}]\r\n'

    assert frame == b'[4000,{"id":"abc","ok":true,"count":3}]\r\n'
    assert list(decode_control_frames(frame)) == [(4000, payload)]
