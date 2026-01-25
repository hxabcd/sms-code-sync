import time

from flask import Blueprint, jsonify, render_template

from app.models import profiles

web_bp = Blueprint('web', __name__)

@web_bp.route("/")
def index():
    """主页"""
    return render_template("index.html", title="首页")

@web_bp.route("/health")
def health_check():
    """健康检查页"""
    return jsonify({
        "status": "healthy",
        "system_time": time.strftime('%H:%M:%S'),
        "profiles_loaded": len(profiles)
    }), 200
