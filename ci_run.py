# ci_run.py
from app.main import generate_fragment, generate_patch

def main():
    print("▶️ Generating GAS fragment...")
    fragment_result = generate_fragment()
    fragment = fragment_result["fragment"]

    if not fragment.strip():
        raise RuntimeError("❌ Claude returned empty fragment")

    print("✅ Fragment generated")

    print("▶️ Generating GAS patch...")
    patch_result = generate_patch()
    patch = patch_result["patch"]

    if not patch.strip():
        raise RuntimeError("❌ Generated patch is empty")

    # Code.gs에 실제 반영
    with open("Code.gs", "w", encoding="utf-8") as f:
        f.write(patch)

    print("✅ Code.gs updated successfully")

    # ---- 최소 GAS 검증 (선택이지만 강력 추천) ----
    if "function" not in patch:
        raise RuntimeError("❌ GAS code seems invalid (no function found)")

    if patch.count("{") != patch.count("}"):
        raise RuntimeError("❌ GAS code brace mismatch")

    print("🎉 CI GAS generation finished cleanly")

if __name__ == "__main__":
    main()
