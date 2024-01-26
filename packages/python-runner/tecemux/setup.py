#!/usr/bin/env python

from setuptools import setup, find_packages

setup(name='tecemux',
      version='0.8',
      description='Scramjet Tecemux for Python',
      author='Scramjet',
      author_email='opensource@scramjet.org',
      packages=["tecemux"],
      package_dir={"tecemux": "."})
