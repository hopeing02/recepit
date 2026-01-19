import os, requests

CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY")

def call_claude(prompt: str) -> str:
    res = requests.post(
        "https://api..anthropic.com/v1/messages",
        headers={
            "x-api-key": CLAUDE_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 1200,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=60,
    )
    res.raise_for_status()
    return res.json()["content"][0]["text"]