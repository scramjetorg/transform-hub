import sys
print("hello from fixture")
sys.stdout.flush()
raise RuntimeError("boom")
