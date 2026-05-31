# problems.md - Python Runner Wrapper

## Blockers
- None yet

## 2026-05-31 resolved blockers
- Resolved capture bootstrap blocker by keeping legacy incoming-channel writers alive through `sitecustomize.py`; without this, `CONTROL`/`IN`/`STDIN` sockets closed during handshake on Python 3.12 and no parity capture was possible.
