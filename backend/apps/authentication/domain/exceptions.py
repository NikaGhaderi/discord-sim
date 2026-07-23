class InvalidCredentialsError(Exception):
    """Raised when a login attempt fails username/password verification."""


class InvalidTwoFactorCodeError(Exception):
    """Raised when a 2FA verification attempt has a wrong or expired code."""


class DuplicateUserError(Exception):
    """Raised when a username or email is already registered."""


class RegistrationValidationError(Exception):
    """Raised when registration input fails validation (bad email, weak password)."""


class InvalidRefreshTokenError(Exception):
    """Raised when a refresh token fails signature/expiry validation."""
