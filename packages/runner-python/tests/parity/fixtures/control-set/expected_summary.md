SET control is recorded, but the legacy runner never awaits handle_set so behavior stays unchanged.
Assertions: CONTROL records a SET logLevel=DEBUG frame; OUT remains debug-disabled; this fixture captures the preserved legacy SET bug.
