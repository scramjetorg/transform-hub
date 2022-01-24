Scramjet in Python
==================

<p align="center">
    <a><img src="https://img.shields.io/github/license/scramjetorg/framework-python?color=green&style=plastic" alt="GitHub license" /></a>
    <a><img src="https://img.shields.io/github/v/tag/scramjetorg/framework-python?label=version&color=blue&style=plastic" alt="version" /></a>
    <a><img src="https://img.shields.io/github/stars/scramjetorg/framework-python?color=pink&style=plastic" alt="GitHub stars" /></a>
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

Basic building block of Scramjet is the `Stream` class. It reads input in
chunks, performs operations on these chunks and produces an iterable output
that can be collected and written somewhere.

**Creating a stream** is done using `read_from` class method. It accepts
any iterable or an object implementing .read() method as the input, and returns
a `Stream` instance.

**Transforming a stream:**

* `map` - transform each chunk in a stream using specified function.
* `filter` - keep only chunks for which specified function evaluates to `True`.
* `flatmap` - run specified function on each chunk, and return all of its results as separate chunks.
* `batch` - convert a stream of chunks into a stream of lists of chunks.

Each of these methods return the modified stream, so they can be chained like
this: `some_stream.map(...).filter(...).batch(...)`

**Collecting data** from the stream (asynchronous):

* `write_to` - write all resulting stream chunks into a target.
* `to_list` - return a list with all stream chunks.
* `reduce` - combine all chunks using specified function.


Examples :books:
--------

Let's say we have a `fruits.csv` file like this:

```csv
orange,sweet,1
lemon,sour,2
pigface,salty,5
banana,sweet,3
cranberries,bitter,6
```

and we want to write the names of the sweet fruits to a separate file.
To do this, write an async function like this:

```python
with open("misc/fruits.csv") as file_in, open("sweet.txt", "w") as file_out:
    await (
        Stream
        .read_from(file_in)
        .map(lambda line: line.split(','))
        .filter(lambda record: record[1] == "sweet")
        .map(lambda record: f"{record[0]}\n")
        .write_to(file_out)
    )
```

and that's it!


You can find more examples in [`hello_datastream.py`](./hello_datastream.py)
file. They don't require any additional dependencies, just the standard library,
so you can run them simply with:

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

Install dependencies:

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
