from pydantic import BaseModel, Field
from typing import Optional


class MessageSubmitRequest(BaseModel):
    message: str = Field(..., min_length=1, description="消息内容")
    provider: Optional[str] = Field(default="未知", description="应用包名")
    title: Optional[str] = Field(default="未知", description="通知标题")


class TOTPVerifyRequest(BaseModel):
    token: str = Field(..., min_length=1, description="TOTP 验证码")


class CodeResponse(BaseModel):
    code: str
    sender: Optional[str]
    provider: str
    timestamp: int
    profile: str


class SessionCheckResponse(BaseModel):
    status: str
    verified: bool
    uuid: str
    remaining: int


class SessionVerifyResponse(BaseModel):
    message: str
    remaining: int


class ErrorResponse(BaseModel):
    error: str
    message: Optional[str] = None
