"""Static validation: verser2 guest Python wheel config alignment.

Verifies that the shared wheel-configuration file is well-formed and that
both install-deps.sh and the Dockerfile reference it, preventing silent
version drift between local development and the published Docker image.

These tests do *not* require the wheel to be downloaded or installed; they
are purely static/file-level checks.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"
REPO_ROOT = SCRIPTS.parent.parent.parent

CONFIG_FILE = SCRIPTS / "verser2-config.sh"
INSTALL_DEPS = SCRIPTS / "install-deps.sh"
DOCKERFILE = REPO_ROOT / "packages" / "runner-python" / "Dockerfile"
REQUIREMENTS = REPO_ROOT / "packages" / "runner-python" / "requirements.txt"
PACKAGE_JSON = REPO_ROOT / "packages" / "runner-python" / "package.json"
PYPROJECT = REPO_ROOT / "packages" / "runner-python" / "pyproject.toml"
PACKAGE_LOCK = REPO_ROOT / "package-lock.json"

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

    def test_published_python_sdk_versions_and_minimum_python_are_aligned(self) -> None:
        config_version = _parse_config(CONFIG_FILE)["VERSER2_VERSION"]
        package = json.loads(PACKAGE_JSON.read_text("utf-8"))
        lock = json.loads(PACKAGE_LOCK.read_text("utf-8"))
        locked_dependency = lock["packages"]["node_modules/@signicode/verser2-guest-python"]
        pyproject = PYPROJECT.read_text("utf-8")

        assert config_version == "0.9.3"
        assert package["dependencies"]["@signicode/verser2-guest-python"] == config_version
        assert locked_dependency["version"] == config_version
        assert locked_dependency["integrity"] == "sha512-3j5rrr7HKWkRXsBP1MdNp/oZMN4bgrSm9CUKLGmNNCKK5Wq5WrTuXt5X2O97ZvD2mYaWZp465NX+sR3lguWQ1w=="
        assert 'requires-python = ">=3.11"' in pyproject

    def test_python_wheel_sha256_matches_the_requirement_pin(self) -> None:
        config_sha = _parse_config(CONFIG_FILE)["VERSER2_WHEEL_SHA256"]
        requirements = REQUIREMENTS.read_text("utf-8")
        sdk_block = requirements.split("verser2-guest-python==", 1)[1]
        assert "verser2-guest-python==0.9.3" in requirements
        assert config_sha == "7e511a910c49cb8efd0af9e1f7f9ee604786aa2c891fbf243b1107cfcbbc509a"
        assert f"--hash=sha256:{config_sha}" in sdk_block

    def test_cryptography_50_hashes_cover_supported_linux_x86_64_wheels(self) -> None:
        requirements = REQUIREMENTS.read_text("utf-8")
        crypto_block = requirements.split("cryptography==", 1)[1].split("h2==", 1)[0]
        assert "cryptography==50.0.0" in requirements
        for digest in (
            "06a32a980526a6ab9a4b9bf8f7385800791e2bb960903cb6b530e4817509a3b7",
            "b42a28c1844fd9de8f3f7d540e36b66f3a9c83fceac7170ebc7a6a19edd9dcae",
            "82148ec5bddac30b51a5b3c1945075f896fa022cb93f8e4a01e9f6ee95292c5f",
        ):
            assert f"--hash=sha256:{digest}" in crypto_block

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

    def test_cffi_requirements_cover_cp311_cp312_and_cp314_wheels(self) -> None:
        content = REQUIREMENTS.read_text("utf-8")
        cffi_block = content.split("cryptography==", 1)[0]
        assert "34e261f78cb6ceaaa36f42f2613f4380d94d9c759a9c73c769ee6e0247364632" in cffi_block
        assert "c1453022f490d2459a11819d83ad1d586e9ff65a12ac3e705ffebd46d3685dcf" in cffi_block
        assert "b0431303acaea1089ad4b3e9ce4e6518193def1118d4073ca848635ee4ea2e96" in cffi_block


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

    def test_install_deps_resolves_verified_wheel_through_hashed_requirements(self) -> None:
        content = INSTALL_DEPS.read_text("utf-8")
        pip_args_construction = content.split("PIP_ARGS=(", 1)[1].split("python3 -m pip install", 1)[0]
        assert '--find-links "${TMP_DIR}"' in pip_args_construction
        assert '"${TMP_DIR}/${VERSER2_WHEEL}"' not in pip_args_construction

    def test_install_deps_separates_unpinned_developer_requirements(self) -> None:
        content = INSTALL_DEPS.read_text("utf-8")
        runtime_install, dev_install = content.split('if [[ "${INCLUDE_DEV}" == "1" ]]', 1)
        assert "requirements-dev.txt" not in runtime_install
        assert "python3 -m pip install" in dev_install
        assert 'requirements-dev.txt' in dev_install


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
