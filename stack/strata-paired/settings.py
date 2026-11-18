"""Read explicitly provisioned, machine-local settings."""
import json
import os
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
MODEL = 'qwen3.8-flash-next-iq3_s'
NO_WINDOW = subprocess.CREATE_NO_WINDOW


def settings(section):
    path = Path(os.environ.get('DSH_STRATA_CONFIG', HERE / 'settings.json'))
    return json.loads(path.read_text(encoding='utf-8-sig'))[section]
