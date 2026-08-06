# Opt-in settings for running the test suite without a Docker Postgres host,
# e.g. locally outside `docker-compose`. Not the project default (see
# setup.cfg's DJANGO_SETTINGS_MODULE) -- use explicitly:
#   DJANGO_SETTINGS_MODULE=config.settings.test pytest
from .development import *  # noqa: F401,F403


DATABASES = {  # noqa: F405
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
