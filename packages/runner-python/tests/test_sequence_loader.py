"""Unit tests for ``runner_python.sequence_loader``.

Verifies the loader contract described in the module docstring:

* Loads a sequence module from a filesystem path via importlib.
* Performs ``os.chdir`` into the sequence directory while the module is live.
* Optionally prepends ``python_path`` to ``sys.path``.
* Entrypoint resolution: ``main`` (primary), ``run`` (transitional fallback),
  ``main`` takes precedence, non-callable ``main`` is an error even when
  ``run`` is available.
* Exposes the module's entrypoint via ``.run`` and ``.entrypoint_name``.
* :meth:`SequenceModule.cleanup` restores cwd, sys.path, and sys.modules.
* On load failure, all side effects are rolled back before the exception
  propagates.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Iterator

import pytest

from runner_python.sequence_loader import (
    SequenceLoadError,
    SequenceModule,
    load_sequence,
)


@pytest.fixture(autouse=True)
def _restore_process_state(tmp_path: Path) -> Iterator[None]:
    """Snapshot/restore cwd, sys.path, and sys.modules around each test.

    Belt-and-braces over the loader's own cleanup so a regression in the loader
    cannot leak state into sibling tests.
    """
    original_cwd = os.getcwd()
    original_path = list(sys.path)
    original_modules = set(sys.modules.keys())
    try:
        yield
    finally:
        try:
            os.chdir(original_cwd)
        except FileNotFoundError:
            os.chdir(str(tmp_path))
        sys.path[:] = original_path
        for name in list(sys.modules.keys()):
            if name not in original_modules:
                sys.modules.pop(name, None)


def _write_sequence(tmp_path: Path, name: str, body: str) -> Path:
    seq_dir = tmp_path / name
    seq_dir.mkdir()
    seq_file = seq_dir / "sequence.py"
    seq_file.write_text(body, encoding="utf-8")
    return seq_file


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


def test_loads_module_from_absolute_file_path(tmp_path: Path) -> None:
    seq_file = _write_sequence(
        tmp_path,
        "seq_basic",
        "MARKER = 'loaded'\n\nasync def run(context, input_stream, *args):\n    return MARKER\n",
    )

    loaded = load_sequence(str(seq_file))
    try:
        assert isinstance(loaded, SequenceModule)
        assert loaded.module.MARKER == "loaded"
        assert callable(loaded.run)
    finally:
        loaded.cleanup()


def test_chdir_to_sequence_directory_during_load(tmp_path: Path) -> None:
    seq_file = _write_sequence(
        tmp_path,
        "seq_chdir",
        "import os\nSEQ_CWD = os.getcwd()\n\n"
        "async def run(context, input_stream, *args):\n    return None\n",
    )
    expected_dir = str(seq_file.parent.resolve())

    loaded = load_sequence(str(seq_file))
    try:
        # cwd was set before the module executed and remains while live.
        assert loaded.module.SEQ_CWD == expected_dir
        assert os.getcwd() == expected_dir
        assert loaded.sequence_dir == expected_dir
    finally:
        loaded.cleanup()


def test_resolves_run_callable_as_plain_function(tmp_path: Path) -> None:
    seq_file = _write_sequence(
        tmp_path,
        "seq_run_func",
        "def run(context, input_stream, *args):\n    return 'sync'\n",
    )

    loaded = load_sequence(str(seq_file))
    try:
        assert callable(loaded.run)
        assert loaded.run(None, None) == "sync"
    finally:
        loaded.cleanup()


def test_resolves_run_callable_as_coroutine(tmp_path: Path) -> None:
    seq_file = _write_sequence(
        tmp_path,
        "seq_run_coro",
        "async def run(context, input_stream, *args):\n    return 'async'\n",
    )

    loaded = load_sequence(str(seq_file))
    try:
        coro = loaded.run(None, None)
        try:
            coro.send(None)
        except StopIteration as stop:
            assert stop.value == "async"
        else:
            coro.close()
            pytest.fail("coroutine did not complete in a single step")
    finally:
        loaded.cleanup()


def test_pythonpath_prepended_for_sibling_imports(tmp_path: Path) -> None:
    extra_pkg_dir = tmp_path / "extra_pkg_dir"
    extra_pkg_dir.mkdir()
    (extra_pkg_dir / "sibling_helper_xyz.py").write_text(
        "VALUE = 'from_extra_path'\n", encoding="utf-8"
    )

    seq_file = _write_sequence(
        tmp_path,
        "seq_with_pp",
        "import sibling_helper_xyz\n\n"
        "MARKER = sibling_helper_xyz.VALUE\n\n"
        "async def run(context, input_stream, *args):\n    return MARKER\n",
    )

    loaded = load_sequence(str(seq_file), python_path=str(extra_pkg_dir))
    try:
        assert loaded.module.MARKER == "from_extra_path"
        # Prepended (index 0) so it wins over any later duplicates.
        assert sys.path[0] == str(extra_pkg_dir.resolve())
    finally:
        loaded.cleanup()


# ---------------------------------------------------------------------------
# Entrypoint resolution: main primary, run fallback
# ---------------------------------------------------------------------------


def test_main_only_entrypoint(tmp_path: Path) -> None:
    """A module with only a callable ``main`` loads with entrypoint_name='main'."""
    seq_file = _write_sequence(
        tmp_path,
        "seq_main_only",
        "def main(context, input_stream, *args):\n    return 'from-main'\n",
    )

    loaded = load_sequence(str(seq_file))
    try:
        assert callable(loaded.run)
        assert loaded.entrypoint_name == "main"
        assert loaded.run(None, None) == "from-main"
    finally:
        loaded.cleanup()


def test_run_only_fallback(tmp_path: Path) -> None:
    """A module with only a callable ``run`` loads as transitional fallback."""
    seq_file = _write_sequence(
        tmp_path,
        "seq_run_only",
        "def run(context, input_stream, *args):\n    return 'from-run'\n",
    )

    loaded = load_sequence(str(seq_file))
    try:
        assert callable(loaded.run)
        assert loaded.entrypoint_name == "run"
        assert loaded.run(None, None) == "from-run"
    finally:
        loaded.cleanup()


def test_main_takes_precedence_over_run(tmp_path: Path) -> None:
    """When both ``main`` and ``run`` are present, ``main`` is used."""
    seq_file = _write_sequence(
        tmp_path,
        "seq_both",
        "def main(context, input_stream, *args):\n    return 'from-main'\n"
        "def run(context, input_stream, *args):\n    return 'from-run'\n",
    )

    loaded = load_sequence(str(seq_file))
    try:
        assert loaded.entrypoint_name == "main"
        assert loaded.run(None, None) == "from-main"
    finally:
        loaded.cleanup()


def test_non_callable_main_raises_even_with_callable_run(tmp_path: Path) -> None:
    """Non-callable ``main`` is an error — never silently fall back to ``run``."""
    seq_file = _write_sequence(
        tmp_path,
        "seq_bad_main",
        "main = 42\n"
        "def run(context, input_stream, *args):\n    return 'from-run'\n",
    )

    with pytest.raises(SequenceLoadError) as excinfo:
        load_sequence(str(seq_file))

    msg = str(excinfo.value)
    assert "main" in msg
    assert "not callable" in msg


def test_non_callable_main_without_run_raises(tmp_path: Path) -> None:
    """Non-callable ``main`` with no ``run`` also raises."""
    seq_file = _write_sequence(tmp_path, "seq_bad_main_no_run", "main = 42\n")

    with pytest.raises(SequenceLoadError) as excinfo:
        load_sequence(str(seq_file))

    msg = str(excinfo.value)
    assert "main" in msg
    assert "not callable" in msg


def test_main_none_raises_even_with_callable_run(tmp_path: Path) -> None:
    """A present-but-None ``main`` is non-callable and must not fall back."""
    seq_file = _write_sequence(
        tmp_path,
        "seq_none_main",
        "main = None\n"
        "def run(context, input_stream, *args):\n    return 'from-run'\n",
    )

    with pytest.raises(SequenceLoadError) as excinfo:
        load_sequence(str(seq_file))

    msg = str(excinfo.value)
    assert "main" in msg
    assert "not callable" in msg


def test_entrypoint_name_is_main_when_selected(tmp_path: Path) -> None:
    """entrypoint_name is 'main' when main is used."""
    seq_file = _write_sequence(
        tmp_path,
        "seq_en_main",
        "async def main(context, input_stream, *args):\n    return 'm'\n"
        "async def run(context, input_stream, *args):\n    return 'r'\n",
    )

    loaded = load_sequence(str(seq_file))
    try:
        assert loaded.entrypoint_name == "main"
    finally:
        loaded.cleanup()


def test_entrypoint_name_is_run_when_fallback(tmp_path: Path) -> None:
    """entrypoint_name is 'run' when falling back to run."""
    seq_file = _write_sequence(
        tmp_path,
        "seq_en_run",
        "async def run(context, input_stream, *args):\n    return 'r'\n",
    )

    loaded = load_sequence(str(seq_file))
    try:
        assert loaded.entrypoint_name == "run"
    finally:
        loaded.cleanup()


# ---------------------------------------------------------------------------
# Error paths
# ---------------------------------------------------------------------------


def test_missing_entrypoint_raises_error(tmp_path: Path) -> None:
    seq_file = _write_sequence(tmp_path, "seq_no_entry", "VALUE = 1\n")

    with pytest.raises(SequenceLoadError) as excinfo:
        load_sequence(str(seq_file))

    assert "no callable" in str(excinfo.value)
    assert "main" in str(excinfo.value) and "run" in str(excinfo.value)


def test_non_callable_run_raises_error(tmp_path: Path) -> None:
    seq_file = _write_sequence(tmp_path, "seq_bad_run", "run = 42\n")

    with pytest.raises(SequenceLoadError) as excinfo:
        load_sequence(str(seq_file))

    assert "no callable" in str(excinfo.value)
    assert "main" in str(excinfo.value) and "run" in str(excinfo.value)


def test_import_error_wrapped_preserving_cause(tmp_path: Path) -> None:
    seq_file = _write_sequence(
        tmp_path,
        "seq_import_err",
        "import this_module_definitely_does_not_exist_xyz123\n\n"
        "async def run(context, input_stream, *args):\n    return None\n",
    )

    with pytest.raises(SequenceLoadError) as excinfo:
        load_sequence(str(seq_file))

    assert excinfo.value.__cause__ is not None
    assert isinstance(excinfo.value.__cause__, ImportError)


# ---------------------------------------------------------------------------
# Side-effect rollback
# ---------------------------------------------------------------------------


def test_failed_load_restores_cwd_and_syspath(tmp_path: Path) -> None:
    extra_pkg_dir = tmp_path / "extra_pkg_dir_rollback"
    extra_pkg_dir.mkdir()
    seq_file = _write_sequence(
        tmp_path,
        "seq_rollback",
        "raise RuntimeError('boom')\n",
    )

    cwd_before = os.getcwd()
    syspath_before = list(sys.path)

    with pytest.raises(SequenceLoadError):
        load_sequence(str(seq_file), python_path=str(extra_pkg_dir))

    assert os.getcwd() == cwd_before
    assert sys.path == syspath_before


def test_cleanup_restores_state_and_is_idempotent(tmp_path: Path) -> None:
    extra_pkg_dir = tmp_path / "extra_pkg_dir_cleanup"
    extra_pkg_dir.mkdir()
    seq_file = _write_sequence(
        tmp_path,
        "seq_cleanup",
        "async def run(context, input_stream, *args):\n    return None\n",
    )

    cwd_before = os.getcwd()
    syspath_before = list(sys.path)
    modules_before = set(sys.modules.keys())

    loaded = load_sequence(str(seq_file), python_path=str(extra_pkg_dir))
    # Confirm side effects took hold.
    assert os.getcwd() == str(seq_file.parent.resolve())
    assert sys.path[0] == str(extra_pkg_dir.resolve())

    loaded.cleanup()
    # cleanup is idempotent: calling twice does not raise or re-mutate.
    loaded.cleanup()

    assert os.getcwd() == cwd_before
    assert sys.path == syspath_before
    new_modules = set(sys.modules.keys()) - modules_before
    assert new_modules == set()


def test_context_manager_invokes_cleanup(tmp_path: Path) -> None:
    seq_file = _write_sequence(
        tmp_path,
        "seq_ctx",
        "async def run(context, input_stream, *args):\n    return None\n",
    )

    cwd_before = os.getcwd()
    with load_sequence(str(seq_file)) as loaded:
        assert isinstance(loaded, SequenceModule)
        assert os.getcwd() == str(seq_file.parent.resolve())

    assert os.getcwd() == cwd_before
