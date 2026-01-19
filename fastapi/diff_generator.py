import difflib

def generate_diff(original: str, fragment: str, label="Code.gs"):
    original_lines = original.splitlines(keepends=True)
    new_lines = original_lines + ["\n"] + fragment.splitlines(keepends=True)

    return "".join(
        difflib.unified_diff(
            original_lines,
            new_lines,
            fromfile=f"{label}.original",
            tofile=f"{label}.patched",
        )
    )