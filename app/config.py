import json
import os


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY") or "you-will-never-guess"
    DEBUG = False
    PORT = int(os.environ.get("PORT", 5074))

    def __init__(self):
        self.load_from_json()

    def load_from_json(self):
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "config.json"
        )
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.MAIL_PROVIDERS = data.get("mail_providers", [])
                self.REGEX_CODE = data.get("regex", {}).get("code", r"\d{4,8}")
                self.REGEX_SENDER = data.get("regex", {}).get(
                    "sender", r"[\[【](.*?)[\]】]"
                )
                self.PROFILES_DATA = data.get("profiles", [])
                self.API_KEY = os.environ.get("API_KEY") or data.get("api_key")
        else:
            self.MAIL_PROVIDERS = []
            self.REGEX_CODE = r"\d{4,8}"
            self.REGEX_SENDER = r"[\[【](.*?)[\]】]"
            self.PROFILES_DATA = []
            self.API_KEY = os.environ.get("API_KEY")


config = Config()
