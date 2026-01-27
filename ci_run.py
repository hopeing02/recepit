# ci_run.py
from app.main import generate_patch

def main():
    patch = generate_patch()

    if not patch.strip():
        raise RuntimeError("Patch is empty")

    with open("Code.gs", "w", encoding="utf-8") as f:
        f.write(patch)

    print("✅ Code.gs updated successfully")

if __name__ == "__main__":
    main()
