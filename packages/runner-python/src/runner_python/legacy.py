"""Unsupported best-effort compatibility helpers for old Python sequences.

The primary runner-python contract is ``main(context, input_stream, *args)`` with
snake_case metadata. This module centralises the small legacy affordances that
remain for old sequences so they do not spread through the new-contract runtime
paths.

These helpers are intentionally narrow and unsupported. They do not recreate old
module-global framework APIs; they only interpret legacy metadata keys and
legacy result attributes when those values are already present.
"""

from __future__ import annotations

from typing import Any


LEGACY_CONTENT_TYPE_KEY = "contentType"


def legacy_topic_from_meta(meta: dict[str, Any], kind: str) -> str:
    """Return legacy topic from ``requires``/``provides`` metadata keys."""
    topic = meta.get(kind, "")
    if isinstance(topic, str):
        return topic
    return ""


def legacy_content_type_from_meta(meta: dict[str, Any]) -> str:
    """Return legacy ``contentType`` metadata value when it is a string."""
    content_type = meta.get(LEGACY_CONTENT_TYPE_KEY, "")
    if isinstance(content_type, str):
        return content_type
    return ""


def legacy_result_attr(result: Any, attr_name: str) -> str:
    """Return a legacy string attribute from result/Stream-like objects."""
    value = getattr(result, attr_name, "")
    if isinstance(value, str):
        return value
    return ""
