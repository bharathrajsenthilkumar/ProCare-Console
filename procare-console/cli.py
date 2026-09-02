import sys
from pathlib import Path

# Ensure procare-console is in sys.path
root_dir = Path(__file__).resolve().parent
if (root_dir / "procare-console").exists():
    sys.path.insert(0, str(root_dir / "procare-console"))
else:
    sys.path.insert(0, str(root_dir))

from cli.main import main

if __name__ == "__main__":
    main()
