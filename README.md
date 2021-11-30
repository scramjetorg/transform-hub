Scramjet in Python
==================

_Tested with Python 3.8.10 and Ubuntu 20.04._


Most important methods
----------------------

* `read_from` - create a new stream from an iterable or an object implementing .read() method.
* `map` - transform each chunk in a stream using specified function.
* `filter` - keep only chunks for which specified function evaluates to `True`.
* `to_list` - write all resulting stream chunks into a list.
* `reduce` - combine all chunks using specified function.


Examples
--------

Take a look at `hello_world_datastream.py` file. You can run it with:

    python hello_world_datastream.py


Running tests
-------------

Create and activate a virtualenv:

    sudo apt install python3-virtualenv
    virtualenv -p python3 venv
    . venv/bin/activate

Check Python version:

    $ python --version
    Python 3.8.10

Install libraries:

    pip install -r dev-requirements.txt

Run test cases (with activated virtualenv):

    pytest

(add a filename if you want to limit which tests are ran)

If you want to enable detailed debug logging, set one of the following env variables:

    PYFCA_DEBUG=1       # debug pyfca
    DATASTREAM_DEBUG=1  # debug datastream
    SCRAMJET_DEBUG=1    # debug both
