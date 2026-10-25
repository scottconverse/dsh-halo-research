"""Reuse the installed application's environment and CLI without opening its UI."""
import sys
from pathlib import Path
root = Path.home() / "AppData/Local/Programs/TextFlowKit"
sys.path.insert(0, str(root))
from launch import configure_environment
configure_environment(root)
from textflowkit.cli import main
raise SystemExit(main(sys.argv[1:]))
