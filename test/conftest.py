import pytest
import os
import scramjet.utils as utils

@pytest.fixture(autouse=True)
def setup():
    utils.LogWithTimer.reset()
    # add a newline before test output, so that it doesn't start on the same
    # line as pytest info (when pytest is ran with -vs)
    print()

@pytest.fixture()
def named_pipe(tmp_path):
    path = tmp_path / 'test_pipe'
    os.mkfifo(path)
    yield path
    os.remove(path)
