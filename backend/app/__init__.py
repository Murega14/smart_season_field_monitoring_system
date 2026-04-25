from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

from config import Config

from app.models import db
from app.routes.auth import auth_bp
from app.routes.fields import fields_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    jwt = JWTManager()
    jwt.init_app(app)
    
    migrate = Migrate()
    db.init_app(app)
    migrate.init_app(app, db)
    
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": ["http://localhost:3000", "http://127.0.0.1:5000", "https://smart-season-field-monitoring-syste-phi.vercel.app"],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
                "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
                "expose_headers": [
                    "Content-Range",
                    "X-Content-Range",
                    "X-RateLimit-Limit",
                    "X-RateLimit-Remaining",
                    "X-RateLimit-Reset",
                ],
                "supports_credentials": True,
            }
        },
    )
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(fields_bp)
    
    return app