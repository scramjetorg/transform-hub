Setup
-----

Optonally create a virtualenv:

    virtualenv venv
    . venv/bin/activate

Check Python version:

    $ python --version
    Python 3.8.10

Install libraries:

    pip install -r requirements.txt


Usage
-----

Create fifos:

    mkfifo input output ctrl

Open 4 terminals and run the following commands:

```bash
./spammer.sh > input  # generate input
cat output  # collect output
cat - > ctrl  # attach to control stream for writing commands
./runner-poc.py input output ctrl example_sequence
```

If you send a line with a number to the control pipe, this number will be added
to processed input.
