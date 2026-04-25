from functools import wraps
from http import HTTPStatus
import uuid

from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.models import User, db

def admin_required(function):
    @wraps(function)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = db.session.get(User, uuid.UUID(get_jwt_identity()))
        if not user or user.role != 'admin':
            return jsonify({'error': 'admin access required'}), HTTPStatus.FORBIDDEN
        
        return function(*args, **kwargs)
    
    return wrapper

def field_agent_required(function):
    @wraps(function)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = db.session.get(User, uuid.UUID(get_jwt_identity()))
        if not user or user.role != 'field_agent':
            return jsonify({'error': 'admin access required'}), HTTPStatus.FORBIDDEN
        
        return function(*args, **kwargs)
    
    return wrapper