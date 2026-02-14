import json
from functools import wraps
from typing import Any, Dict, Optional, Tuple
from uuid import uuid4 as uuid_gen

from flask import Blueprint, Response, jsonify, request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from loguru import logger
from pydantic import ValidationError

from app.config import config
from app.models import profiles
from app.schemas import MessageSubmitRequest, TOTPVerifyRequest
from app.services.events import event_manager, event_stream_generator
from app.services.message_service import MessageService

api_bp = Blueprint("api", __name__, url_prefix="/api")


def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_key = request.headers.get("X-API-Key") or request.args.get("api_key")
        if not auth_key or auth_key != config.API_KEY:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)

    return decorated_function


def get_uuid(user_request) -> str:
    return user_request.cookies.get("uuid", str(uuid_gen()))


def set_uuid_cookie(response, uuid: str):
    response.set_cookie(
        "uuid",
        value=uuid,
        max_age=7 * 24 * 3600,
        httponly=True,
        secure=request.is_secure,
        samesite="Lax",
    )
    return response


@api_bp.route("/profiles", methods=["GET"])
def list_profiles():
    """List all profile names."""
    return jsonify(list(profiles.keys()))


@api_bp.route("/profiles/<name>/session", methods=["GET"])
def check_session(name: str):
    """Check if the current session is verified for the given profile."""
    profile = profiles.get(name)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    uuid = get_uuid(request)
    is_verified, remaining = profile.check_verified(uuid)

    response = jsonify(
        {
            "status": "Verified" if is_verified else "Not verified",
            "verified": is_verified,
            "uuid": uuid,
            "remaining": remaining,
        }
    )

    return set_uuid_cookie(response, uuid)


@api_bp.route("/profiles/<name>/session", methods=["POST"])
def verify_session(name: str):
    """Verify TOTP token and create a session."""
    profile = profiles.get(name)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    uuid = get_uuid(request)

    is_verified, remaining = profile.check_verified(uuid)
    if is_verified:
        return jsonify({"message": "Already verified", "remaining": remaining}), 200

    try:
        data = request.get_json()
        validated = TOTPVerifyRequest(**data)
    except (TypeError, ValidationError) as e:
        return jsonify({"error": "Bad Request", "message": "Invalid token format"}), 400

    if profile.verify(uuid, validated.token):
        logger.info(f"Session verified successfully for profile: {name}, uuid: {uuid}")
        response = jsonify(
            {"message": "Verified successfully", "remaining": profile.window}
        )
        return set_uuid_cookie(response, uuid)
    logger.warning(f"Invalid verification attempt for profile: {name}, uuid: {uuid}")
    return jsonify({"error": "Invalid token"}), 403


@api_bp.route("/profiles/<name>/session", methods=["DELETE"])
def logout_session(name: str):
    """End the verified session."""
    profile = profiles.get(name)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    uuid = get_uuid(request)
    profile.last_verified.pop(uuid, None)
    logger.info(f"User logged out from profile: {name}, uuid: {uuid}")
    return jsonify({"message": "Logged out"})


@api_bp.route("/profiles/<name>/codes", methods=["GET"])
def get_codes(name: str):
    """Retrieve recent codes for a verified session."""
    profile = profiles.get(name)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    is_verified, _ = profile.check_verified(get_uuid(request))
    if not is_verified:
        return jsonify({"error": "Forbidden"}), 403

    return jsonify({"codes": list(profile.codes)})


@api_bp.route("/profiles/<name>/codes", methods=["DELETE"])
def clear_codes(name: str):
    """Clear all stored codes for a profile."""
    profile = profiles.get(name)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    is_verified, _ = profile.check_verified(get_uuid(request))
    if not is_verified:
        return jsonify({"error": "Forbidden"}), 403

    profile.codes.clear()
    return jsonify({"message": "Codes cleared"})


@api_bp.route("/profiles/<name>/messages", methods=["POST"])
@require_api_key
def submit_message(name: str):
    """Submit a new message (Requires API Key)."""
    try:
        data = request.get_json()
        validated = MessageSubmitRequest(**data)
    except (TypeError, ValidationError) as e:
        return jsonify({"error": "Bad Request", "message": "Invalid message format"}), 400

    profile = profiles.get(name)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    result, error = MessageService.process_message(profile, validated.model_dump())
    if error:
        logger.error(f"Failed to process message for profile {name}: {error}")
        return jsonify({"error": error}), 400

    logger.success(
        f"Message processed for profile {name}: {result['code']} from {result['sender']}"
    )
    return jsonify({"message": "Processed", "data": result})


@api_bp.route("/stream")
def stream_events():
    """SSE endpoint for real-time updates with heartbeat."""
    return Response(
        event_stream_generator(event_manager),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
