"""Execute argument arrays through the installed LibreOffice CLI in one session."""
import json
import sys
from cli_anything.libreoffice.libreoffice_cli import cli

def main():
    if len(sys.argv) != 2:
        raise ValueError("Usage: run_commands.py commands.json")
    with open(sys.argv[1], encoding="utf-8-sig") as source:
        commands = json.load(source)
    if not isinstance(commands, list) or not commands:
        raise ValueError("Expected a nonempty array of command argument arrays")
    for args in commands:
        if not isinstance(args, list) or not args or not all(isinstance(x, str) for x in args):
            raise ValueError("Each command must be a nonempty array of strings")
        if args[0] not in {"document", "writer", "calc", "impress", "style", "session", "export"}:
            raise ValueError("Expected a noninteractive CLI command group")
        if len(args) < 2:
            raise ValueError("A subcommand is required")
    for args in commands:
        cli.main(args=["--json", *args], standalone_mode=False)
    return 0

if __name__ == "__main__":
    sys.exit(main())
