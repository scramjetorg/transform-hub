#!/bin/bash

WHICH_SI=$(which si)
if [ $? -ne 0 ]; then
    echo "[Error] Couldn't find scramjet bash command si" >&2
    exit 1
fi

SI_LINK_PATH=$(readlink -f $WHICH_SI)
SI_LINK_DIR=$(dirname $SI_LINK_PATH)
SI_COMPLETION_PATH=$( cd $SI_LINK_DIR ; cd ../scripts/completion ; pwd )

SI_COMPLETION_SCRIPT=$SI_COMPLETION_PATH/si
if ! test -f "$SI_COMPLETION_SCRIPT"; then
    echo "[Error] Couldn't find scramjet completion script in ${SI_COMPLETION_SCRIPT}." >&2
    exit 2
fi

BASH_COMPLETION=/etc/bash_completion.d/si
sudo ln -sf $SI_COMPLETION_SCRIPT $BASH_COMPLETION
if [ $? -ne 0 ]; then
    echo "[Error] Failed to link completion script from ${SI_COMPLETION_SCRIPT} to ${BASH_COMPLETION}" >&2
    exit 3
fi

source $BASH_COMPLETION
