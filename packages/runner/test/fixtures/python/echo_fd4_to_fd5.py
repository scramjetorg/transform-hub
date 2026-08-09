import os, sys
fd4 = os.fdopen(4, "rb", buffering=0)
fd5 = os.fdopen(5, "wb", buffering=0)
while True:
    data = fd4.read(4096)
    if not data:
        break
    fd5.write(b"ECHO:" + data)
    fd5.flush()
sys.exit(0)
