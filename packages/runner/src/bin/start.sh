#!/bin/bash

export NODE_EXECUTABLE=${NODE_EXECUTABLE:-$(which node)}
export RUNNER=${RUNNER:-$(dirname $0)/start-runner}

PIPES_LOCATION=${PIPES_LOCATION:-/pipes}

export STDIO_IN=$PIPES_LOCATION/stdin
export STDIO_OUT=$PIPES_LOCATION/stdout
export STDIO_ERR=$PIPES_LOCATION/stderr

export CRASH_LOG=${CRASH_LOG:-$PIPES_LOCATION/crash_log}

$NODE_EXECUTABLE ${RUNNER} < $STDIO_IN > $STDIO_OUT 2> $STDIO_ERR

{
    echo <<EOD
--------------
CRASH LOG
--------------
EOD

    echo DATE=`date -I`
    echo NODE_EXECUTABLE=${NODE_EXECUTABLE}
    echo RUNNER=${RUNNER}
    echo PIPES_LOCATION=${PIPES_LOCATION}
    echo STDIO_IN=${STDIO_IN}
    echo STDIO_OUT=${STDIO_OUT}
    echo STDIO_ERR=${STDIO_ERR}

    echo
    echo "--- residual data in stdout ---"
    cat $STDIO_OUT

    echo
    echo "--- residual data in stderr ---"
    cat $STDIO_ERR

} >> $CRASH_LOG
