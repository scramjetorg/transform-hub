KILL control terminates the legacy runner immediately without graceful stop messaging.
Assertions: CONTROL records a KILL frame after kill-ready; process exits 1; legacy runner emits no SEQUENCE_STOPPED for immediate kill.
