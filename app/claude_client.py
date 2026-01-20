import os, requests

CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY")

def call_claude(prompt: str) -> str:
    res = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": CLAUDE_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": "claude-sonnet-4-5-20250929",
            "max_tokens": 4096,
            "messages": [{"role": "user", "content": prompt}],
        },
        thinking={"type": "enabled", "budget_tokens": 2000},
        timeout=60,
    )
    res.raise_for_status()
    return res.json()["content"][0]["text"]
