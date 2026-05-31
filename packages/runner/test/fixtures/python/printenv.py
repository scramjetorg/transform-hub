import os, sys
for key in sorted(os.environ.keys()):
    print(key)
boot_config_path = sys.argv[1] if len(sys.argv) > 1 else None
if not boot_config_path or not os.path.isfile(boot_config_path):
    sys.exit(2)
sys.exit(0)
