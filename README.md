IFCA implementation in Python
=============================

Environment setup
-----------------

_Tested with Python 3.8.10 and Ubuntu 20.04._

Create and activate a virtualenv:

    virtualenv -p python3 venv
    . venv/bin/activate

Check Python version:

    $ python --version
    Python 3.8.10

Install libraries:

    pip install -r dev-requirements.txt


Usage
-----

Run test cases (with activated virtualenv):

    python -m pytest

(add a filename if you want to limit which tests are ran)

If you want to enable detailed debug logging, set one of the following env variables:

    PYFCA_DEBUG=1       # debug pyfca
    DATASTREAM_DEBUG=1  # debug datastream
    SCRAMJET_DEBUG=1    # debug both


Proof of correctness
--------------------

`pts.py` demonstrates the correctness of the algorithm.

The input sequence for the test is a list of dictionaries, each containing an
`id` key which matches the order of the item in the sequence.

The transformation consists of two functions:
- the first one returns immediately for inputs with even `id` but has a delay
  for inputs with odd `id`,
- the second one is synchronous and returns immediately.

The soft limit for number of items processed in parallel is 4.

To perform the test, run:

    PYFCA_DEBUG=1 python3 pts.py

The following happens:

1. Six items are written.
1. First 3 writes resolve immediately, because processing queue is initially
   empty.
1. Next 3 writes return a pending Future object, which get resolved as previous
   items are processed.
1. First transformation is performed on the items in the order matching their
   `id`s.
1. Second transformation is performed as soon as items become available. This
   means that it's performed on the elements with even `id`s first, because
   they are ready for processing earlier than the elements with odd `id`s.
1. However, the ordering of the results matches the input order.

Final results look as follows:

    {'id': 0, 'n': 0, 'x': 0, 'y': 0}
    {'id': 1, 'n': 1, 'x': 1, 'y': 3}
    {'id': 2, 'n': 0, 'x': 2, 'y': 1}
    {'id': 3, 'n': 1, 'x': 3, 'y': 4}
    {'id': 4, 'n': 0, 'x': 4, 'y': 2}
    {'id': 5, 'n': 1, 'x': 5, 'y': 5}

The added keys indicate the order of execution of specific operations within
the `IFCA` transform chain.  The meaning is as follows:

- `id` is exactly the same as in input,
- `n` denotes item parity (even items have `n=0`) - a visual helper to see
  which data points were delayed,
- `x` is the order of the execution of the first function,
- `y` is the order of the execution of the second function.

The test indicates that the chained functions are executed immediately after
each other (as soon as the item is processed by one function it starts being
procesed by the next function), while the read order exactly follows the write
order.
