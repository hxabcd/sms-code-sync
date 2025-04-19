"""
The backend of SMS Code Sync
Repo: https://github.com/hxabcd/sms-code-sync
"""

import json
import os
import re
import time
import typing
from collections import deque
from uuid import uuid4 as uuidgen

import pyotp
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app, supports_credentials=True)


class Profile:
    """用户配置，用于存储验证码并处理身份验证"""
    def __init__(self, name: str, secret: str, window: int, maxlen: int):
        self.name = name
        self.secret = secret
        self.totp = pyotp.TOTP(secret)
        self.window = window
        self.codes = deque(maxlen=maxlen)
        self.last_verified: typing.Dict[str, int] = {}

    def check_verified(self, uuid: str):
        """检查 UUID 是否已验证"""
        print(self.last_verified)
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
            print(f"Verification successful for UUID {uuid} with token {token}")
            return True
        # TOTP 无效
        print(f"Verification failed for UUID {uuid} with token {token}")
        return False


profiles: typing.Dict[str, Profile] = {}

# 读取配置文件
with open("config.json", "r", encoding="utf-8") as config_file:
    config = json.load(config_file)
    MAIL_PROVIDERS = config["mail_providers"]  # 邮箱发送者
    # 正则表达式
    REGEX_CODE = config["regex"]["code"]  # 提取验证码
    REGEX_SENDER = config["regex"]["sender"]  # 提取发送者
    # 用户配置
    for item in config["profiles"]:
        name = item.get("name")
        secret = item.get("secret")
        window = item.get("window", 180)
        maxlen = item.get("maxlen", 3)
        profiles[name] = Profile(name, secret, window, maxlen)


def get_uuid(request):
    """从 Cookies 获取或生成 UUID"""
    return request.cookies.get("uuid", str(uuidgen()))


@app.route("/list-profiles", methods=["GET"])
def list_profiles():
    """列出所有配置"""
    return jsonify(list(profiles.keys()))


@app.route("/check-verified", methods=["GET"])
def check_verified():
    """检查用户身份验证状态"""
    profile_name = request.args.get("profile")
    profile = profiles.get(profile_name)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    uuid = get_uuid(request)
    if profile.check_verified(uuid):
        print(f"UUID {uuid} is verified for profile {profile_name}")
        response = jsonify({"message": "Verified", "uuid": uuid, "status": True})
    else:
        print(f"UUID {uuid} is not verified for profile {profile_name}")
        response = jsonify({"message": "Not verified", "uuid": uuid, "status": False})

    response.set_cookie(
        "uuid",
        value=uuid,
        max_age=7 * 24 * 3600,
        httponly=True,
        secure=True,
        samesite="Lax",
    )
    return response, 200


@app.route("/verify", methods=["POST"])
def verify():
    """验证用户身份"""
    # 获取用户配置及参数
    data = request.get_json()
    profile_name = data.get("profile")
    profile = profiles.get(profile_name)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    token = data.get("token")
    if not token:
        return jsonify({"error": "Token not provided"}), 400

    # 验证
    uuid = get_uuid(request)
    if profile.verify(uuid, token):
        response = jsonify({"message": "Succeed"})
        response.set_cookie(
            "uuid",
            value=uuid,
            max_age=7 * 24 * 3600,
            httponly=True,
            secure=True,
            samesite="Lax",
        )
        return response, 200
    else:
        return jsonify({"error": "Invalid token"}), 403


@app.route("/logout", methods=["GET"])
def logout():
    """注销，删除验证记录"""
    profile_name = request.args.get("profile")
    profile = profiles.get(profile_name)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    uuid = get_uuid(request)
    if profile.check_verified(uuid):
        profile.last_verified.pop(uuid)
        return jsonify({"message": "Succeed"}), 200
    return jsonify({"error": "No permission"}), 403


@app.route("/submit-message", methods=["POST"])
def handle_message_submit():
    """接收短信内容并提取验证码和发送者，存储最近三条验证码"""
    # 获取用户配置及参数
    data = request.get_json()
    profile_name: str = data.get("profile")
    profile: Profile = profiles.get(profile_name)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    message: str = data.get("message")
    if not message:
        return jsonify({"error": "Message not provided"}), 400
    provider: str = data.get("provider", "未知")
    title: str = data.get("title", "未知")

    # 提取验证码
    code_match = re.search(REGEX_CODE, message)
    code = code_match.group() if code_match else None
    # 无验证码，退出
    if not code:
        return jsonify({"error": "No code found in the message"}), 400

    # 提取发送者
    # 判断验证码类型
    if (provider in MAIL_PROVIDERS) or (not title.isdigit()):  # 邮件验证码 或 标题含发送者的短信验证码
        sender = title
    else:  # 标题不含发送者的短信验证码
        sender_match = re.search(REGEX_SENDER, message)
        sender = sender_match.group(1) if sender_match else None

    # 添加至验证码列表
    timestamp = int(time.time())
    profile.codes.appendleft({"code": code, "timestamp": timestamp, "sender": sender})
    print(f"Code {code} from sender {sender} received for profile {profile_name}")
    return (
        jsonify(
            {
                "message": "Code received",
                "code": code,
                "provider": provider,
                "sender": sender,
            }
        ),
        200,
    )


@app.route("/get-codes", methods=["GET"])
def get_codes():
    """提供验证码数据，需通过验证"""
    profile_name = request.args.get("profile")
    profile = profiles.get(profile_name)
    if not profile:
        return jsonify({"error": f"Profile not found ({profile_name})"}), 404

    uuid = get_uuid(request)
    if profile.check_verified(uuid):
        return jsonify({"codes": list(profile.codes)}), 200
    return jsonify({"error": "No permission"}), 403


@app.route("/clear-codes", methods=["GET"])
def clear_codes():
    """清空存储的验证码"""
    profile_name = request.args.get("profile")
    profile = profiles.get(profile_name)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    if profile.check_verified(get_uuid(request)):
        profile.codes.clear()
        return jsonify({"message": "Succeed"}), 200
    return jsonify({"error": "No permission"}), 403


@app.route("/")
def index():
    """默认页"""
    return f"Server is running on port {os.getenv('PORT')}"

@app.route("/health")
def health_check():
    """健康检查页"""
    return jsonify({
        "status": "healthy",
        "system_time": time.strftime('%H:%M:%S'),
        "profiles_loaded": len(profiles)
    }), 200

if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=os.getenv("PORT"))
