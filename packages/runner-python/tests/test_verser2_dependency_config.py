"""Static validation: verser2 guest Python wheel config alignment.

Verifies that the shared wheel-configuration file is well-formed and that
both install-deps.sh and the Dockerfile reference it, preventing silent
version drift between local development and the published Docker image.

These tests do *not* require the wheel to be downloaded or installed; they
are purely static/file-level checks.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"
REPO_ROOT = SCRIPTS.parent.parent.parent

CONFIG_FILE = SCRIPTS / "verser2-config.sh"
INSTALL_DEPS = SCRIPTS / "install-deps.sh"
DOCKERFILE = REPO_ROOT / "packages" / "runner-python" / "Dockerfile"

# Expected variable names that must be defined in the config file
REQUIRED_VARS = (
    "VERSER2_VERSION",
    "VERSER2_WHEEL",
    "VERSER2_WHEEL_SHA256",
    "VERSER2_WHEEL_URL",
)


def _parse_config(path: Path) -> dict[str, str]:
    """Parse VARIABLE="value" assignments from a .sh file (skip comments)."""
    vars_: dict[str, str] = {}
    content = path.read_text("utf-8")
    for line in content.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        # Match VARIABLE="value" with optional ${...} expansion we ignore
        m = re.match(r'^(VERSER2_\w+)=["\']?(.*?)["\']?$', stripped)
        if m:
            # If value contains ${...}, keep raw (not expanded here)
            vars_[m.group(1)] = m.group(2)
    return vars_


class TestVerser2Config:
    """Validates the shared verser2-config.sh file."""

    def test_config_file_exists(self) -> None:
        assert CONFIG_FILE.is_file(), (
            f"Shared config not found at {CONFIG_FILE}. "
            "This file is the single source of truth for the verser2 wheel version."
        )

    def test_config_defines_required_vars(self) -> None:
        vars_ = _parse_config(CONFIG_FILE)
        for var in REQUIRED_VARS:
            assert var in vars_, (
                f"Missing required variable '{var}' in {CONFIG_FILE}"
            )
            assert vars_[var].strip(), (
                f"Variable '{var}' is empty in {CONFIG_FILE}"
            )

    @pytest.mark.parametrize("var", REQUIRED_VARS)
    def test_required_var_value_is_nonempty(self, var: str) -> None:
        vars_ = _parse_config(CONFIG_FILE)
        value = vars_.get(var, "")
        assert value and value.strip(), (
            f"Variable '{var}' must have a non-empty value"
        )

    def test_version_format(self) -> None:
        vars_ = _parse_config(CONFIG_FILE)
        version = vars_.get("VERSER2_VERSION", "")
        assert re.match(r"^\d+\.\d+\.\d+$", version), (
            f"VERSER2_VERSION '{version}' does not look like semver"
        )

    def test_wheel_name_references_version_variable(self) -> None:
        vars_ = _parse_config(CONFIG_FILE)
        wheel = vars_.get("VERSER2_WHEEL", "")
        # The raw value contains a shell variable reference that resolves at runtime.
        assert "${VERSER2_VERSION}" in wheel, (
            f"VERSER2_WHEEL '{wheel}' should reference ${{VERSER2_VERSION}}"
        )
        assert wheel.startswith("verser2_guest_python-"), (
            f"VERSER2_WHEEL should start with 'verser2_guest_python-': {wheel}"
        )
        assert wheel.endswith("-py3-none-any.whl"), (
            f"VERSER2_WHEEL should end with '-py3-none-any.whl': {wheel}"
        )

    def test_wheel_url_references_version_variable(self) -> None:
        vars_ = _parse_config(CONFIG_FILE)
        url = vars_.get("VERSER2_WHEEL_URL", "")
        assert "${VERSER2_VERSION}" in url, (
            f"VERSER2_WHEEL_URL '{url}' should reference ${{VERSER2_VERSION}}"
        )
        assert "${VERSER2_WHEEL}" in url, (
            f"VERSER2_WHEEL_URL '{url}' should reference ${{VERSER2_WHEEL}}"
        )

    def test_wheel_url_format(self) -> None:
        vars_ = _parse_config(CONFIG_FILE)
        url = vars_.get("VERSER2_WHEEL_URL", "")
        assert url.startswith("https://github.com/signicode/verser2/releases/download/"), (
            f"Unexpected wheel URL prefix: {url}"
        )
        # Final suffix is constructed from variables; check the static prefix
        assert "releases/download/v" in url, (
            f"Wheel URL should contain '/download/v': {url}"
        )

    def test_sha256_is_hex_string(self) -> None:
        vars_ = _parse_config(CONFIG_FILE)
        sha = vars_.get("VERSER2_WHEEL_SHA256", "")
        assert re.match(r"^[0-9a-f]{64}$", sha), (
            f"VERSER2_WHEEL_SHA256 '{sha}' should be a 64-char hex string"
        )


class TestInstallDepsSourcesConfig:
    """Validates that install-deps.sh sources the shared config."""

    def test_install_deps_exists(self) -> None:
        assert INSTALL_DEPS.is_file()

    def test_install_deps_sources_verser2_config(self) -> None:
        content = INSTALL_DEPS.read_text("utf-8")
        assert ". " in content or "source " in content, (
            "install-deps.sh does not source any file"
        )
        assert "verser2-config.sh" in content, (
            "install-deps.sh must source verser2-config.sh to avoid version drift"
        )

    def test_install_deps_no_longer_defines_version_inline(self) -> None:
        """After the refactor, version constants live only in verser2-config.sh."""
        content = INSTALL_DEPS.read_text("utf-8")
        # The old inline lines should be gone.
        assert 'VERSER2_VERSION="' not in content, (
            "install-deps.sh should not define VERSER2_VERSION inline; "
            "source verser2-config.sh instead"
        )


class TestDockerfileUsesConfig:
    """Validates that the Dockerfile references the shared config."""

    def test_dockerfile_exists(self) -> None:
        assert DOCKERFILE.is_file()

    def test_dockerfile_copies_verser2_config(self) -> None:
        content = DOCKERFILE.read_text("utf-8")
        assert "verser2-config.sh" in content, (
            "Dockerfile must COPY and source verser2-config.sh to keep "
            "the installed wheel version aligned with local dev"
        )

    def test_dockerfile_has_sha256_check(self) -> None:
        content = DOCKERFILE.read_text("utf-8")
        assert "sha256sum" in content, (
            "Dockerfile must verify the wheel checksum with sha256sum"
        )

    def test_dockerfile_pip_includes_wheel(self) -> None:
        content = DOCKERFILE.read_text("utf-8")
        # After the refactor, the pip install should reference the wheel
        assert "requirements.txt" in content
        assert "${VERSER2_WHEEL}" in content or "VERSER2_WHEEL" in content, (
            "Dockerfile pip install must include the verser2 wheel"
        )
