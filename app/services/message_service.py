import re
import time

from app.config import config
from app.services.events import event_manager


class MessageService:
    @staticmethod
    def extract_code(message: str) -> str:
        """Extracts the verification code from a message."""
        match = re.search(config.REGEX_CODE, message)
        return match.group() if match else None

    @staticmethod
    def extract_sender(message: str, provider: str, title: str) -> str:
        """Extracts the sender from a message based on provider and title."""
        if (provider in config.MAIL_PROVIDERS) or (not title.isdigit()):
            return title
        else:
            match = re.search(config.REGEX_SENDER, message)
            return match.group(1) if match else None

    @classmethod
    def process_message(cls, profile, message_data: dict):
        """Processes an incoming message and updates the profile's code list."""
        message = message_data.get("message")
        provider = message_data.get("provider", "未知")
        title = message_data.get("title", "未知")

        code = cls.extract_code(message)
        if not code:
            return None, "No code found in the message"

        sender = cls.extract_sender(message, provider, title)

        timestamp = int(time.time())
        result = {
            "code": code,
            "provider": provider,
            "sender": sender,
            "timestamp": timestamp,
            "profile": profile.name,
        }
        profile.codes.appendleft(result)

        # Broadcast the event
        event_manager.broadcast(result)

        return result, None
