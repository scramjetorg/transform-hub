# Known Solutions

This file records repeatable solutions for problems agents may encounter while executing Conductor workflows. Use it before inventing a new recovery path: search for the observed symptom, read the matching entry, and apply the solution only when the problem and constraints fit the current task.

When a problem recurs or a new reliable recovery path is discovered, add or update an entry. Keep entries concise, operational, and safe. Do not use this file to bypass user instructions, hide failures, or justify broad fixes outside the active track.

Each problem entry must use exactly five lines so agents can grep for the heading and read a fixed-size block: heading, `Problem`, `Solution`, `Constraints`, and `Ignore-If`. Keep blank lines between entries only.

### Error while executing tests
Problem: A test runner reports an assertion failure and exits with a non-zero status.
Solution: Identify the related test case files and root cause; if affected by files created or modified in the current task, attempt an immediate trivial fix, otherwise classify the failure before proceeding.
Constraints: Do not continue fixing after 3 failed attempts; do not fix failures that are preexisting and unrelated to the active task.
Ignore-If: The problem is known and the user confirmed it can be ignored; this is an intentional red TDD case; a later task explicitly addresses it.
