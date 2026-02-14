import pytest
from app.schemas import MessageSubmitRequest, TOTPVerifyRequest


def test_message_submit_request_valid():
    data = {
        "message": "验证码是 123456",
        "provider": "com.android.mms",
        "title": "测试"
    }
    request = MessageSubmitRequest(**data)
    assert request.message == "验证码是 123456"
    assert request.provider == "com.android.mms"
    assert request.title == "测试"


def test_message_submit_request_defaults():
    data = {
        "message": "测试消息"
    }
    request = MessageSubmitRequest(**data)
    assert request.message == "测试消息"
    assert request.provider == "未知"
    assert request.title == "未知"


def test_message_submit_request_invalid():
    with pytest.raises(Exception):
        MessageSubmitRequest(message="")


def test_totp_verify_request_valid():
    data = {"token": "123456"}
    request = TOTPVerifyRequest(**data)
    assert request.token == "123456"


def test_totp_verify_request_invalid():
    with pytest.raises(Exception):
        TOTPVerifyRequest(token="")
