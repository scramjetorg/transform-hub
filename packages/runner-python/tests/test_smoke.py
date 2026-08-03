def test_import_runner_python():
    import runner_python  # noqa: F401
    assert runner_python.__name__ == "runner_python"
