import redis
from django.conf import settings

from core.redis_client import get_redis_client


def test_settings_defines_redis_url():
    """Regression test: get_redis_client() reads settings.REDIS_URL, which
    must actually be defined there (it previously wasn't -- only the env
    var was read inline inside CHANNEL_LAYERS)."""
    assert settings.REDIS_URL


def test_get_redis_client_builds_without_a_live_connection():
    # redis.Redis.from_url() only builds a connection pool; it doesn't open
    # a socket until a command is issued, so this is safe without a server.
    client = get_redis_client()
    assert isinstance(client, redis.Redis)
