from datetime import datetime, timedelta, timezone

from apps.shared.infrastructure.auth_redis import RedisAuthStore


class FakeRedis:
    def __init__(self):
        self.values = {}

    def setex(self, key, ttl, value):
        self.values[key] = (ttl, value)

    def get(self, key):
        value = self.values.get(key)
        return None if value is None else value[1]

    def delete(self, key):
        self.values.pop(key, None)

    def exists(self, key):
        return key in self.values


class TestRedisAuthStore:
    def test_two_factor_challenge_is_single_use(self):
        store = RedisAuthStore(client=FakeRedis())
        code, temp_token = store.create_two_factor_challenge(user_id=42)

        assert len(code) == 6
        assert store.consume_two_factor_challenge(temp_token, code) == 42
        assert store.consume_two_factor_challenge(temp_token, code) is None

    def test_wrong_two_factor_code_does_not_consume_challenge(self):
        store = RedisAuthStore(client=FakeRedis())
        code, temp_token = store.create_two_factor_challenge(user_id=42)

        assert store.consume_two_factor_challenge(temp_token, "wrong") is None
        assert store.consume_two_factor_challenge(temp_token, code) == 42

    def test_refresh_token_is_saved_to_blacklist(self):
        store = RedisAuthStore(client=FakeRedis())
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=5)).timestamp()

        store.blacklist_refresh_token("refresh-token", expires_at)

        assert store.is_refresh_token_blacklisted("refresh-token") is True
