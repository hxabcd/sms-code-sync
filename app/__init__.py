import logging

from flask import Flask
from flask_cors import CORS


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
    logging.basicConfig(level=logging.INFO)
    
    # Import and register blueprints
    from app.routes.api import api_bp
    from app.routes.web import web_bp
    
    app.register_blueprint(api_bp)
    app.register_blueprint(web_bp)

    return app
