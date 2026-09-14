#!/bin/bash

# The pre-runner already owns these paths.  It runs as the unprivileged
# `prerunner` user, so attempting to chown them to the runner image's user
# would fail (and that user is not present in this image).
