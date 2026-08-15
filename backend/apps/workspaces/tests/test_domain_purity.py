import ast
from pathlib import Path

import pytest

DOMAIN_DIR = Path(__file__).resolve().parent.parent / "domain"
FORBIDDEN_PREFIXES = ("django", "rest_framework")


def _imported_modules(source_path: Path) -> list[str]:
    tree = ast.parse(source_path.read_text(encoding="utf-8"))
    modules = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            modules.extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            modules.append(node.module)
    return modules


@pytest.mark.parametrize(
    "filename",
    ["models.py", "exceptions.py", "roles.py", "permission_validation.py"],
)
def test_domain_module_has_no_framework_imports(filename):
    """Encodes the .cursorrules rule: domain/ must stay framework-agnostic.

    permission_validation.py imports from apps.permissions.domain.permissions,
    which is fine -- cross-domain imports between apps' domain layers are
    allowed precedent in this repo. Only django/rest_framework are forbidden.
    """
    source_path = DOMAIN_DIR / filename
    offending = [
        m for m in _imported_modules(source_path) if m.startswith(FORBIDDEN_PREFIXES)
    ]
    assert not offending, f"{filename} must stay framework-agnostic, found: {offending}"
