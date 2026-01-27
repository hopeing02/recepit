from fastapi import FastAPI
from app.schema_loader import load_schema_diff
from app.fragment_prompt_builder import build_code_gs_prompt
from app.claude_client import call_claude
from app.diff_generator import generate_diff

app = FastAPI()

@app.post("/claude/fragment/code-gs")
def generate_fragment():
    diff = load_schema_diff("../schema_diff/receipt_schema_diff.json")
    prompt = build_code_gs_prompt(diff)
    fragment = call_claude(prompt)
    return {"fragment": fragment}

@app.post("/generate/patch/code-gs")
def generate_patch():
    with open("Code.gs", encoding="utf-8") as f:
        original = f.read()

    diff = load_schema_diff("../schema_diff/receipt_schema_diff.json")
    prompt = build_code_gs_prompt(diff)
    fragment = call_claude(prompt)

    patch = generate_diff(original, fragment)
    return {"patch": patch}
