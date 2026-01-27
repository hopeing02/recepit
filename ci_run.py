# ci_run.py
from app.main import generate_patch

def main():
    patch = generate_patch()

    if "function" not in patch:
        raise RuntimeError("Invalid GAS code generated")

if __name__ == "__main__":
    main()
