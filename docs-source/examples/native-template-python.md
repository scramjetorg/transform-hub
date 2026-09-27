---
id: examples-native-template-python
slug: /examples/native-template-python
title: Native Python sequence template
---

# Native Python sequence template

`templates/sequences/python` is a dependency-free Python 3 sequence starter. Its entrypoint is `main.py`, and its example output is `native-template-python: hello world`.

## Local verification

From the template directory, run:

```sh
python3 -m unittest
```

The template uses only the Python standard library. If you add Python packages, declare them in `requirements.txt`; the Python runtime handles that file when the sequence starts.

## Scaffold, package, and deploy

Create a copy in a new project directory with:

```sh
si scaffold sequence python --path ./my-sequence
cd ./my-sequence
python3 -m unittest
si sequence pack .
si sequence deploy .
```

The final command uploads the package and starts the sequence using the configured Hub.
