class InvalidCredentialsError(Exception):
    """Raised when a login attempt fails username/password verification."""


class InvalidTwoFactorCodeError(Exception):
    """Raised when a 2FA verification attempt has a wrong or expired code."""
