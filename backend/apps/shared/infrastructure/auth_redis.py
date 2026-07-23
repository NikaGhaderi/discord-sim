import hashlib
import hmac
import json
import secrets
from datetime import datetime, timezone

from core.redis_client import get_redis_client


class RedisAuthStore:
    """Redis persistence for short-lived 2FA challenges and token revocation."""

    challenge_ttl_seconds = 5 * 60

    def __init__(self, client=None):
        self.client = client or get_redis_client()

    def create_two_factor_challenge(self, user_id):
        code = f"{secrets.randbelow(1_000_000):06d}"
        temp_token = secrets.token_urlsafe(32)
        value = json.dumps({"user_id": user_id, "code": code})
        self.client.setex(
            self._challenge_key(temp_token), self.challenge_ttl_seconds, value
        )
        return code, temp_token

    def consume_two_factor_challenge(self, temp_token, submitted_code):
        key = self._challenge_key(temp_token)
        raw_value = self.client.get(key)
        if raw_value is None:
            return None

        if isinstance(raw_value, bytes):
            raw_value = raw_value.decode("utf-8")

        try:
            challenge = json.loads(raw_value)
        except (TypeError, ValueError):
            return None

        expected_code = str(challenge.get("code", ""))
        if not hmac.compare_digest(expected_code, str(submitted_code)):
            return None

        self.client.delete(key)
        return challenge.get("user_id")

    def blacklist_refresh_token(self, refresh_token, expires_at):
        now = datetime.now(timezone.utc).timestamp()
        ttl_seconds = max(1, int(expires_at - now))
        self.client.setex(self._blacklist_key(refresh_token), ttl_seconds, "1")

    def is_refresh_token_blacklisted(self, refresh_token):
        return bool(self.client.exists(self._blacklist_key(refresh_token)))

    @staticmethod
    def _challenge_key(temp_token):
        return f"authentication:2fa:{temp_token}"

    @staticmethod
    def _blacklist_key(refresh_token):
        digest = hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()
        return f"authentication:refresh-blacklist:{digest}"
