#!/bin/bash
# wait-for-it.sh: wait until a TCP host:port responds, then execute.
# Uses bash's /dev/tcp built-in so no external dependencies.

set -e

HOST="$1"
PORT="$2"
shift 2

TIMEOUT=${TIMEOUT:-30}
INTERVAL=2

if [ -z "$HOST" ] || [ -z "$PORT" ]; then
    echo "Usage: $0 <host> <port> [-- command...]"
    exit 1
fi

echo "Waiting for $HOST:$PORT (timeout=${TIMEOUT}s)..."

for i in $(seq 1 $((TIMEOUT / INTERVAL))); do
    if (echo > "/dev/tcp/${HOST}/${PORT}") 2>/dev/null; then
        echo "$HOST:$PORT is available after $((i * INTERVAL))s"
        if [ $# -gt 0 ]; then
            exec "$@"
        fi
        exit 0
    fi
    sleep $INTERVAL
done

echo "Timeout: $HOST:$PORT not reachable after ${TIMEOUT}s"
exit 1
