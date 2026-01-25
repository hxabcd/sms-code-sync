import json
from functools import wraps
from uuid import uuid4 as uuid_gen

from flask import Blueprint, Response, jsonify, request

from app.config import config
from app.models import profiles
from app.services.events import event_manager
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


@api_bp.route("/profiles", methods=["GET"])
def list_profiles():
    """List all profile names."""
    return jsonify(list(profiles.keys()))


@api_bp.route("/profiles/<name>/session", methods=["GET"])
def check_session(name):
    """Check if the current session is verified for the given profile."""
    profile = profiles.get(name)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    uuid = get_uuid(request)
    is_verified = profile.check_verified(uuid)

    response = jsonify(
        {
            "status": "Verified" if is_verified else "Not verified",
            "verified": is_verified,
            "uuid": uuid,
        }
    )

    response.set_cookie(
        "uuid",
        value=uuid,
        max_age=7 * 24 * 3600,
        httponly=True,
        secure=request.is_secure,
        samesite="Lax",
    )
    return response


@api_bp.route("/profiles/<name>/session", methods=["POST"])
def verify_session(name):
    """Verify TOTP token and create a session."""
    profile = profiles.get(name)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    uuid = get_uuid(request)

    # Avoid redundant verification if already verified
    if profile.check_verified(uuid):
        return jsonify({"message": "Already verified"}), 200

    data = request.get_json()
    token = data.get("token")
    if not token:
        return jsonify({"error": "Token required"}), 400

    if profile.verify(uuid, token):
        response = jsonify({"message": "Verified successfully"})
        response.set_cookie(
            "uuid",
            value=uuid,
            max_age=7 * 24 * 3600,
            httponly=True,
            secure=request.is_secure,
            samesite="Lax",
        )
        return response
    return jsonify({"error": "Invalid token"}), 403


@api_bp.route("/profiles/<name>/session", methods=["DELETE"])
def logout_session(name):
    """End the verified session."""
    profile = profiles.get(name)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    uuid = get_uuid(request)
    profile.last_verified.pop(uuid, None)
    return jsonify({"message": "Logged out"})


@api_bp.route("/profiles/<name>/codes", methods=["GET"])
def get_codes(name):
    """Retrieve recent codes for a verified session."""
    profile = profiles.get(name)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    if not profile.check_verified(get_uuid(request)):
        return jsonify({"error": "Forbidden"}), 403

    return jsonify({"codes": list(profile.codes)})


@api_bp.route("/profiles/<name>/codes", methods=["DELETE"])
def clear_codes(name):
    """Clear all stored codes for a profile."""
    profile = profiles.get(name)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    if not profile.check_verified(get_uuid(request)):
        return jsonify({"error": "Forbidden"}), 403

    profile.codes.clear()
    return jsonify({"message": "Codes cleared"})


@api_bp.route("/profiles/<name>/messages", methods=["POST"])
@require_api_key
def submit_message(name):
    """Submit a new message (Requires API Key)."""
    data = request.get_json()
    profile = profiles.get(name)
    if not profile:
        return jsonify({"error": "Profile not found"}), 404

    result, error = MessageService.process_message(profile, data)
    if error:
        return jsonify({"error": error}), 400

    return jsonify({"message": "Processed", "data": result})


@api_bp.route("/stream")
def stream_events():
    """SSE endpoint for real-time updates."""

    def event_stream():
        q = event_manager.listen()
        while True:
            data = q.get()
            yield f"data: {json.dumps(data)}\n\n"

    return Response(event_stream(), mimetype="text/event-stream")
