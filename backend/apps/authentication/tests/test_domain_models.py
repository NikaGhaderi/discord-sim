import ast
from pathlib import Path

from apps.authentication.domain.models import UserEntity


def test_user_entity_defaults_match_erd():
    user = UserEntity(
        username="nika_gh", email="nika@example.com", password_hash="hash"
    )

    assert user.id is None
    assert user.is_2fa_enabled is False
    assert user.allow_group_invitations is True
    assert user.created_at is None


def test_domain_models_has_no_framework_imports():
    """Encodes the .cursorrules rule: domain/ must stay framework-agnostic."""
    source_path = Path(__file__).resolve().parent.parent / "domain" / "models.py"
    tree = ast.parse(source_path.read_text(encoding="utf-8"))

    imported_modules = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported_modules.extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imported_modules.append(node.module)

    forbidden_prefixes = ("django", "rest_framework")
    offending = [m for m in imported_modules if m.startswith(forbidden_prefixes)]
    assert (
        not offending
    ), f"domain/models.py must stay framework-agnostic, found: {offending}"
