import logging
import os
import sys
import time

import jwt

from app.models import User


def setup_logging():
    app_logger = logging.getLogger('smart_season_field_monitoring_system')
    app_logger.setLevel('DEBUG')
    
    if app_logger.handlers:
        app_logger.handlers.clear()
        
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S")

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel('DEBUG')
    console_handler.setFormatter(formatter)
    
    app_logger.addHandler(console_handler)
    
    return app_logger

_logger = setup_logging()

def get_reset_token(email, expires_in: int = 500):
    """Generate a JWT reset token for password recovery."""
    payload = {
        "reset_password": email,
        "exp": int(time.time()) + expires_in,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, key=os.getenv("SECRET_KEY"), algorithm="HS256")


def verify_reset_token(token):
    """Verify and decode a reset token, returning the associated user."""
    try:
        email = jwt.decode(token, key=os.getenv("SECRET_KEY"), algorithms=["HS256"])["reset_password"]
    except jwt.ExpiredSignatureError:
        _logger.error("Reset token has expired")
        return None
    except jwt.InvalidTokenError as e:
        _logger.error("Invalid reset token: %s", str(e))
        return None

    return User.query.filter_by(email=email).first()