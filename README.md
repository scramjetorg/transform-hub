Scramjet in Python
==================

<p align="center">
    <a><img src="https://img.shields.io/github/license/scramjetorg/scramjet-dev-python?color=green&style=plastic" alt="GitHub license" /></a>
    <a><img src="https://img.shields.io/github/v/tag/scramjetorg/scramjet-dev-python?label=version&color=blue&style=plastic" alt="version" /></a>
    <a><img src="https://img.shields.io/github/stars/scramjetorg/scramjet-dev-python?color=pink&style=plastic" alt="GitHub stars" /></a>
    <a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=7F7V65C43EBMW">
        <img src="https://img.shields.io/badge/Donate-PayPal-green.svg?color=yellow&style=plastic" alt="Donate" />
    </a>
</p>
<p align="center">⭐ Star us on GitHub — it motivates us a lot! 🚀 </p>
<p align="center">
    <img src="https://assets.scramjet.org/images/framework-logo-256.svg" width="420" alt="Scramjet Framework">
</p>


Scramjet is a simple reactive stream programming framework. The code is written
by chaining functions that transform the streamed data, including well known
map, filter and reduce.

The main advantage of Scramjet is running asynchronous operations on your data
streams concurrently. It allows you to perform the transformations both
synchronously and asynchronously by using the same API - so now you can "map"
your stream from whatever source and call any number of API's consecutively.

[Originally written](https://github.com/scramjetorg/scramjet) on top of node.js
object streams, Scramjet is now being ported into Python. This is what is
happening in this repository.

>_Tested with Python 3.8.10 and Ubuntu 20.04._


Getting started :construction_worker:
----------------------

Basic building block of Scramjet is the `Stream` class.
Here are its most important methods:

Create a stream:

* `read_from` - create a new stream from an iterable or an object implementing .read() method.

Transform a stream:

* `map` - transform each chunk in a stream using specified function.
* `filter` - keep only chunks for which specified function evaluates to `True`.
* `flatmap` - run specified function on each chunk, and return all of its results as separate chunks.
* `batch` - convert a stream of chunks into a stream of lists of chunks.

Collect data from the stream (asynchronous):

* `to_list` - return a list with all stream chunks.
* `write_to` - write all resulting stream chunks into a target.
* `reduce` - combine all chunks using specified function.


Examples :books:
--------

Take a look at [`hello_datastream.py`](./hello_datastream.py) file.
You can run it with:

    python hello_datastream.py


Running tests :chart_with_upwards_trend:
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

> :bulb: **HINT:** add a filename if you want to limit which tests are run

If you want to enable detailed debug logging, set one of the following env variables:

```bash
PYFCA_DEBUG=1       # debug pyfca
DATASTREAM_DEBUG=1  # debug datastream
SCRAMJET_DEBUG=1    # debug both
```
