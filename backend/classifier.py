import os
import re
from typing import Dict, Tuple
import yaml

CODING_KEYWORDS = {
    "code",
    "coding",
    "function",
    "def",
    "class",
    "method",
    "debug",
    "debugging",
    "python",
    "javascript",
    "typescript",
    "java",
    "c++",
    "cpp",
    "c#",
    "csharp",
    "golang",
    "rust",
    "html",
    "css",
    "sql",
    "syntax",
    "refactor",
    "algorithm",
    "traceback",
    "exception",
    "error",
    "bug",
    "import",
    "return",
    "var",
    "const",
    "let",
    "struct",
    "void",
    "public",
    "private",
    "api",
    "endpoint",
    "regex",
    "script",
}

FILE_EXTENSION_PATTERN = re.compile(
    r"\b\w+\.(py|cpp|c|h|java|cs|js|ts|go|rs|html|css|json|sql|sh|ps1|yaml|yml)\b",
    re.IGNORECASE,
)
CODE_BLOCK_PATTERN = re.compile(
    r"```|\bdef\s+\w+|\bclass\s+\w+|\bfunction\s+\w+|\bimport\s+\w+|\bfrom\s+\w+\s+import|\bfor\s+\w+\s+in\b|\bwhile\s*\(|\bif\s*\(",
    re.IGNORECASE,
)
STACK_TRACE_PATTERN = re.compile(
    r"traceback|exception|error:|at line|file \".*\", line", re.IGNORECASE
)

DEFAULT_REGISTRY_PATH = os.path.join(os.path.dirname(__file__), "models.yaml")


def load_models_registry(
    registry_path: str = DEFAULT_REGISTRY_PATH,
) -> Dict[str, str]:
    if not os.path.exists(registry_path):
        return {"GENERAL_REASONING": "llama3.2:3b", "CODING": "qwen2.5-coder:7b"}
    with open(registry_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    mapping = {}
    for item in data.get("models", []):
        tag = item.get("tag")
        for task_type in item.get("task_types", []):
            mapping[task_type] = tag
    return mapping


def classify_task(
    prompt: str, registry_path: str = DEFAULT_REGISTRY_PATH
) -> Tuple[str, str]:
    mapping = load_models_registry(registry_path)
    coding_model = mapping.get("CODING", "qwen2.5-coder:7b")
    general_model = mapping.get("GENERAL_REASONING", "llama3.2:3b")

    prompt_lower = prompt.lower()
    matched_signals = []

    # 1. Check for file extensions
    ext_matches = FILE_EXTENSION_PATTERN.findall(prompt)
    if ext_matches:
        matched_signals.append(f"file extension (.{ext_matches[0]})")

    # 2. Check for code syntax / blocks
    if CODE_BLOCK_PATTERN.search(prompt):
        matched_signals.append("code block/syntax pattern")

    # 3. Check for stack trace / error patterns
    if STACK_TRACE_PATTERN.search(prompt_lower):
        matched_signals.append("error/stack-trace pattern")

    # 4. Check for coding keywords
    words = re.findall(r"\b[a-zA-Z0-9_+#\.-]+\b", prompt_lower)
    found_keywords = [w for w in words if w in CODING_KEYWORDS]
    if found_keywords:
        unique_kw = list(dict.fromkeys(found_keywords))
        matched_signals.append(f"keywords: {', '.join(unique_kw[:5])}")

    if matched_signals:
        reason = f"Coding task detected ({'; '.join(matched_signals)})"
        return coding_model, reason
    else:
        reason = (
            "General reasoning task detected: standard text/conversation prompt"
        )
        return general_model, reason
