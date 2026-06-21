from __future__ import annotations

from runner_python.legacy import (
    legacy_content_type_from_meta,
    legacy_result_attr,
    legacy_topic_from_meta,
)
from runner_python.sequence_loader import SequenceModule
from runner_python.utils import build_runtime_pangs, get_input_content_type, get_output_content_type


def _make_module(attrs: dict):
    class FakeModule:
        pass

    module = FakeModule()
    for key, value in attrs.items():
        setattr(module, key, value)
    return module


def _make_sequence(attrs: dict) -> SequenceModule:
    return SequenceModule(
        module=_make_module(attrs),
        run=lambda _ctx, _input, *_args: None,
        sequence_dir="/tmp",
        entrypoint_name="main",
        _original_cwd="/",
    )


def test_legacy_helpers_ignore_non_string_values() -> None:
    assert legacy_topic_from_meta({"requires": 123}, "requires") == ""
    assert legacy_content_type_from_meta({"contentType": 123}) == ""

    class Result:
        provides = 123

    assert legacy_result_attr(Result(), "provides") == ""


def test_legacy_metadata_is_best_effort_but_snake_case_wins() -> None:
    sequence = _make_sequence({
        "requires": {
            "topic": "new-input",
            "content_type": "application/x-ndjson",
            "requires": "legacy-input",
            "contentType": "text/plain",
        },
        "provides": {
            "topic": "new-output",
            "content_type": "application/octet-stream",
            "provides": "legacy-output",
            "contentType": "text/plain",
        },
    })

    assert get_input_content_type(sequence) == "application/x-ndjson"
    assert get_output_content_type(sequence, None) == "application/octet-stream"
    assert build_runtime_pangs(sequence, None) == [
        {"provides": "new-output", "contentType": "application/octet-stream"},
        {"requires": "new-input", "contentType": "application/x-ndjson"},
    ]


def test_legacy_stream_like_result_attributes_are_best_effort() -> None:
    sequence = _make_sequence({})

    class LegacyStreamLike:
        provides = "legacy-output"
        requires = "legacy-input"
        content_type = "application/x-ndjson"

    result = LegacyStreamLike()

    assert get_output_content_type(sequence, result) == "application/x-ndjson"
    assert build_runtime_pangs(sequence, result) == [
        {"provides": "legacy-output", "contentType": "application/x-ndjson"},
        {"requires": "legacy-input", "contentType": "application/x-ndjson"},
    ]


def test_empty_legacy_result_attributes_do_not_suppress_module_metadata() -> None:
    sequence = _make_sequence({
        "provides": {"topic": "module-output", "content_type": "application/x-ndjson"},
        "requires": {"topic": "module-input", "content_type": "text/plain"},
    })

    class LegacyStreamLike:
        provides = ""
        requires = ""
        content_type = ""

    assert get_output_content_type(sequence, LegacyStreamLike()) == "application/x-ndjson"
    assert build_runtime_pangs(sequence, LegacyStreamLike()) == [
        {"provides": "module-output", "contentType": "application/x-ndjson"},
        {"requires": "module-input", "contentType": "text/plain"},
    ]


def test_module_global_legacy_hooks_are_not_interpreted_as_runtime_contract() -> None:
    sequence = _make_sequence({
        "set_health_check": lambda: {"healthy": False},
        "set_stop_handler": lambda _handler: None,
    })

    assert get_input_content_type(sequence) == "text/plain"
    assert get_output_content_type(sequence, None) == ""
    assert build_runtime_pangs(sequence, None) == []
