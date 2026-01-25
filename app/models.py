import time
import typing
from collections import deque
from dataclasses import dataclass, field

import pyotp

from app.config import config


@dataclass
class Profile:
    """用户配置，用于存储验证码并处理身份验证"""

    name: str
    secret: str
    window: int
    maxlength: int
    totp: pyotp.TOTP = field(init=False)
    codes: deque = field(init=False)
    last_verified: typing.Dict[str, int] = field(default_factory=dict)

    def __post_init__(self):
        self.totp = pyotp.TOTP(self.secret)
        self.codes = deque(maxlen=self.maxlength)

    def check_verified(self, uuid: str):
        """检查 UUID 是否已验证"""
        last_verified_time = self.last_verified.get(uuid)
        if not last_verified_time:
            return False
        current_time = int(time.time())
        return (current_time - last_verified_time) < self.window

    def verify(self, uuid: str, token: str):
        """验证 TOTP 并记录"""
        if self.totp.verify(token):
            # 验证成功，记录当前时间戳
            current_time = int(time.time())
            self.last_verified[uuid] = current_time
            return True
        return False


# Global store for profiles
profiles: typing.Dict[str, Profile] = {}


def init_profiles():
    """Initializes profiles from configuration, prioritizing Environment Variables for secrets."""
    import os

    for item in config.PROFILES_DATA:
        name = item.get("name")
        # Try loading secret from Env Var: SECRET_MODULENAME
        env_secret = os.environ.get(f"SECRET_{name.upper()}")
        secret = env_secret or item.get("secret")

        if not secret:
            print(f"Warning: No secret found for profile {name}. Skipping.")
            continue

        window = item.get("window", 180)
        maxlength = item.get("maxlen", 3)
        profiles[name] = Profile(name, secret, window, maxlength)


init_profiles()
