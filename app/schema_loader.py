# fastapi/schema_loader.py
import json
from pathlib import Path

def load_schema_diff(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f
