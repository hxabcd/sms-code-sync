

from flask import Flask, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman


def create_app(config_class=None):
    app = Flask(
        __name__,
        template_folder="../frontend/dist",
        static_folder="../frontend/dist",
        static_url_path="/",
    )

    if config_class:
        app.config.from_object(config_class)

    CORS(app, supports_credentials=True)

    # Initialize logging
    from app.utils.logger import setup_logger

    setup_logger(debug=app.config.get("DEBUG", False))

    # Initialize rate limiter
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=["400 per day", "90 per hour"],
        storage_uri="memory://",
    )

    # Initialize security headers
    csp = {
        "default-src": "'self'",
        "script-src": "'self' 'unsafe-inline'",
        "style-src": "'self' 'unsafe-inline'",
        "img-src": "'self' data:",
        "font-src": "'self'",
        "connect-src": "'self'",
        "frame-src": "'none'",
        "object-src": "'none'",
    }

    Talisman(
        app,
        content_security_policy=csp,
        force_https=False,
        session_cookie_secure=False,
        session_cookie_http_only=True,
        session_cookie_samesite="Lax",
        strict_transport_security=False,
    )

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Not Found", "message": str(error)}), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"error": "Method Not Allowed", "message": str(error)}), 405

    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({"error": "Rate limit exceeded", "message": str(e.description)}), 429

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Internal Server Error"}), 500

    # Import and register blueprints
    from app.routes.api import api_bp
    from app.routes.web import web_bp

    app.register_blueprint(api_bp)
    app.register_blueprint(web_bp)

    return app
