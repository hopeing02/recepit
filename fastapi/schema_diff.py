import json

def load_schema_diff(path: str):
    with open(path, encoding="utf-8") as f:
        return json.load(f)