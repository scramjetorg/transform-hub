application/octet-stream input stays binary and is forwarded without text line splitting.
Assertions: IN contains a payload with embedded newline and non-UTF8 bytes; OUT wraps the exact binary payload with BIN:/:END; MONITORING includes requires/provides PANG frames for binary topics.
