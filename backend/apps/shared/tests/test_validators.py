import pytest

from apps.shared.domain.exceptions import InvalidFileError
from apps.shared.domain.validators import MAX_FILE_SIZE_BYTES, validate_file


def test_rejects_zero_size():
    with pytest.raises(InvalidFileError):
        validate_file(0, "image/png")


def test_rejects_negative_size():
    with pytest.raises(InvalidFileError):
        validate_file(-1, "image/png")


def test_rejects_oversized_file():
    with pytest.raises(InvalidFileError):
        validate_file(MAX_FILE_SIZE_BYTES + 1, "image/png")


def test_rejects_disallowed_content_type():
    with pytest.raises(InvalidFileError):
        validate_file(100, "application/x-executable")


def test_accepts_valid_size_and_type():
    validate_file(100, "image/png")
