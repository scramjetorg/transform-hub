"""Sequence module loader for runner-python.

Loads a sequence Python module from a filesystem path using
``importlib.util.spec_from_file_location``. The loader:

* Resolves the absolute sequence path and uses its parent directory as cwd
  while the module is loaded and live.
* Optionally augments ``sys.path`` with a caller-provided ``python_path``
  (typically ``BootConfig.pythonPath``) for the lifetime of the loaded
  module - the entry is removed on :meth:`SequenceModule.cleanup`.
* Exposes the loaded module's ``run`` callable. Missing/non-callable ``run``
  raises :class:`SequenceLoadError`.

Invoking ``run()`` is the caller's responsibility; this module is purely a
loader so it can be tested independently of stream wiring.
"""

from __future__ import annotations

import importlib.util
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Optional


class SequenceLoadError(RuntimeError):
    """Raised when a sequence module cannot be loaded or has no ``run`` callable."""


@dataclass
class SequenceModule:
    """Loaded sequence module with its ``run`` entry point.

    Holds onto the resources acquired during load (original cwd, sys.path
    entry, registered ``sys.modules`` key) so they can be released via
    :meth:`cleanup` or by using the instance as a context manager.
    """

    module: Any
    run: Callable[..., Any]
    sequence_dir: str
    _original_cwd: str = field(repr=False)
    _added_sys_path: Optional[str] = field(default=None, repr=False)
    _module_name: Optional[str] = field(default=None, repr=False)
    _cleaned: bool = field(default=False, repr=False)

    def cleanup(self) -> None:
        """Restore cwd, drop the sys.path augmentation, and unregister the module.

        Idempotent - safe to call multiple times. Best-effort: individual
        failures (e.g. cwd already gone) are swallowed so cleanup never
        masks the original error path.
        """
        if self._cleaned:
            return
        self._cleaned = True

        try:
            os.chdir(self._original_cwd)
        except OSError:
            pass

        if self._added_sys_path is not None:
            try:
                sys.path.remove(self._added_sys_path)
            except ValueError:
                pass

        if self._module_name is not None:
            sys.modules.pop(self._module_name, None)

    def __enter__(self) -> "SequenceModule":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.cleanup()


_MODULE_NAME = "_runner_python_sequence"


def load_sequence(
    sequence_path: str,
    python_path: Optional[str] = None,
) -> SequenceModule:
    """Load the sequence module at ``sequence_path``.

    * ``sequence_path`` - path to the sequence's entry ``.py`` file. May be
      relative; resolved against the current working directory.
    * ``python_path`` - optional directory prepended to ``sys.path`` so the
      sequence can import sibling helper modules. Removed again on cleanup.

    Returns a :class:`SequenceModule`. Raises :class:`SequenceLoadError` on
    any import failure or when the module does not expose a callable ``run``.
    On failure all side effects (cwd change, ``sys.path`` mutation, partially
    registered module) are reverted before the exception propagates.
    """
    resolved = Path(sequence_path).resolve()
    sequence_dir = str(resolved.parent)
    original_cwd = os.getcwd()

    if not resolved.exists():
        raise SequenceLoadError(f"sequence file not found: {resolved}")

    added_path: Optional[str] = None
    if python_path:
        added_path = str(Path(python_path).resolve())
        sys.path.insert(0, added_path)

    try:
        os.chdir(sequence_dir)
    except OSError as err:
        if added_path is not None:
            try:
                sys.path.remove(added_path)
            except ValueError:
                pass
        raise SequenceLoadError(
            f"cannot chdir to sequence directory {sequence_dir}: {err}"
        ) from err

    module_registered = False
    try:
        spec = importlib.util.spec_from_file_location(_MODULE_NAME, str(resolved))
        if spec is None or spec.loader is None:
            raise SequenceLoadError(
                f"cannot create import spec for sequence at {resolved}"
            )

        module = importlib.util.module_from_spec(spec)
        sys.modules[_MODULE_NAME] = module
        module_registered = True

        try:
            spec.loader.exec_module(module)
        except SequenceLoadError:
            raise
        except Exception as err:  # noqa: BLE001 - re-raised as SequenceLoadError
            raise SequenceLoadError(
                f"failed to import sequence at {resolved}: {err}"
            ) from err

        run = getattr(module, "run", None)
        if run is None or not callable(run):
            raise SequenceLoadError("missing run callable")

        return SequenceModule(
            module=module,
            run=run,
            sequence_dir=sequence_dir,
            _original_cwd=original_cwd,
            _added_sys_path=added_path,
            _module_name=_MODULE_NAME,
        )
    except BaseException:
        # Roll back all side-effects so the caller sees a clean process state.
        try:
            os.chdir(original_cwd)
        except OSError:
            pass
        if added_path is not None:
            try:
                sys.path.remove(added_path)
            except ValueError:
                pass
        if module_registered:
            sys.modules.pop(_MODULE_NAME, None)
        raise
