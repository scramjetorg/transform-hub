STOP control awaits the registered stop handler before the legacy runner emits SEQUENCE_STOPPED.
Assertions: CONTROL records a STOP frame after stop-handler-ready; MONITORING shows stop-handler-ran EVENT before SEQUENCE_STOPPED; exit code is 1 because legacy stop exits via sys.exit(1).
