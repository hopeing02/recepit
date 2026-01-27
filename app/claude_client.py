# app/claude_client.py
import os
import requests

API_URL = " https://api.anthropic.com/v1/messages"

def call_claude(prompt: str) -> str:
    api_key = os.environ["CLAUDE_API_KEY"]

    payload = {
        "model": "claude-sonnet-4-5-20250929",
        "max_tokens": 1024,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }

    res = requests.post(
        API_URL,
        headers=headers,
        json=payload,
        timeout=60,
    )

    res.raise_for_status()

    data = res.json()

    return data["content"][0]["text"]
