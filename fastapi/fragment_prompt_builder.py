def build_code_gs_prompt(schema_diff: dict) -> str:
    return f"""
You are modifying an existing Google Apps Script file.

STRICT RULES:
- DO NOT rewrite the full file
- DO NOT touch UI or existing logic
- ONLY return code fragments to APPEND
- No explanations

Schema diff:
{schema_diff}

Return ONLY the additional Google Apps Script code fragment.
"""