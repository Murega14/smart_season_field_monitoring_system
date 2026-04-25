from datetime import timedelta
from http import HTTPStatus
import os
import resend
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from email_validator import validate_email, EmailNotValidError
from flask import Blueprint, jsonify, make_response, request
from flask_jwt_extended import create_access_token, unset_jwt_cookies

from app.models import User, db
from app.utils import get_reset_token, setup_logging, verify_reset_token


auth_bp = Blueprint('auth_bp', __name__, url_prefix='/api/v1/auth')

logger = setup_logging()
FRONTEND_URL = os.getenv("FRONTEND_URL")
resend.api_key = os.getenv("RESEND_API_KEY")

@auth_bp.route('/signup', methods=['POST'])
def signup_user():
    try:
        data = request.get_json()
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        email = data.get('email')
        password = data.get('password')
        
        if not all([first_name, last_name, email, password]):
            return jsonify({'error': 'required fields missing'}), HTTPStatus.BAD_REQUEST
        
        try:
            validate_email(email)
        except EmailNotValidError:
            return jsonify({'error': 'invalid email format'}), HTTPStatus.BAD_REQUEST
        
        try:
            new_user = User(
                first_name=first_name.strip(),
                last_name=last_name.strip(),
                email=email,
                role='admin',
            )
            new_user.hash_password(password)
            
            db.session.add(new_user)
            db.session.commit()
            
            expires = timedelta(hours=12)
            access_token = create_access_token(identity=str(new_user.id), expires_delta=expires, additional_claims={'role': new_user.role})
            
            response = make_response({
                'success': True, 'msg': 'new admin account created successfully'
            }, HTTPStatus.CREATED)
            response.set_cookie("access_token", access_token, httponly=True, samesite='Lax')
            
            logger.info("new user %s account created", new_user.id)
            return response
        
        except IntegrityError:
            db.session.rollback()
            logger.exception("unique constraint violation")
            return jsonify({'success': False, 'msg': 'email is already associated with another account'}), HTTPStatus.CONFLICT
        
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("database error occurred trying to create a new user account")
            return jsonify({'success': False, 'msg': 'an error occurred, please try again'}), HTTPStatus.INTERNAL_SERVER_ERROR
        
    except Exception:
        logger.exception("an error occurred trying to create a user account")
        return jsonify({'success': False, 'msg': 'internal server error'}), HTTPStatus.INTERNAL_SERVER_ERROR
            
            
@auth_bp.route('/login', methods=['POST'])
def login_user():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        user = User.query.filter_by(email=email).first()
        if user and user.check_password(password):
            expires = timedelta(hours=12)
            access_token = create_access_token(identity=str(user.id), expires_delta=expires, additional_claims={'role': user.role})
            
            response = make_response({
                'success': True, 'msg': 'login successful'
            }, HTTPStatus.OK)
            response.set_cookie("access_token", access_token, httponly=True, samesite='Lax')
            
            return response
        
        else:
            return jsonify({'success': False, 'msg': 'invalid login credentials'}), HTTPStatus.BAD_REQUEST
        
    except Exception:
        logger.exception("an error occurred in the login endpoint")
        return jsonify({'success': False, 'msg': 'internal server error'}), HTTPStatus.INTERNAL_SERVER_ERROR
    
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    try:
        data = request.get_json()
        email = data.get("email")

        try:
            validate_email(email)
        except EmailNotValidError:
            return jsonify({"success": False, "msg": "email address is in the wrong format"}), 400

        user = User.query.filter_by(email=email).first()

        if user:
            token = get_reset_token(email=user.email)
            reset_link = f"{FRONTEND_URL}/reset-password/{token}"

            resend.Emails.send(
                {
                    "from": "onboarding@oldonyosabukprepsch.co.ke",
                    "to": user.email,
                    "subject": "Password Reset Request",
                    "html": f"""
                    <p>Hi {user.first_name},</p>
                    <p>You requested a password reset. Click the link below to reset your password:</p>
                    <a href="{reset_link}">Reset Password</a>
                    <p>This link expires in 10 minutes. If you didn't request this, ignore this email.</p>
                """,
                }
            )

        return (
            jsonify({"success": True, "msg": "if an account exists with that email, a reset link has been sent"}),
            200,
        )

    except Exception as e:
        logger.error("an error occurred trying to reset user password: %s", str(e))
        return jsonify({"success": False, "msg": "internal server error"}), 500


@auth_bp.route("/reset-password/<token>", methods=["POST"])
def reset_password(token: str):
    try:
        data = request.get_json()
        new_password = data.get("password")

        user = verify_reset_token(token)
        if user is None:
            return jsonify({"success": False, "msg": "reset link is invalid"}), 400

        user.hash_password(new_password)
        db.session.commit()

        return jsonify({"success": True, "msg": "password has been reset successfully"}), 200

    except SQLAlchemyError:
        db.session.rollback()
        logger.exception("database error trying to reset user password")
        return jsonify({"success": False, "msg": "an error occurred, please try again"}), 500
    except Exception as e:
        logger.error("an error occurred trying to reset user password: %s", str(e))
        return jsonify({"success": False, "msg": "internal server error"}), 500
    

@auth_bp.route('/logout', methods=['POST'])
def logout_user():
    try:
        response = make_response({
            'success': True,  'msg': 'logged out successfully'
        }, HTTPStatus.OK)
        
        response.delete_cookie("access_token")
        
        unset_jwt_cookies(response)
        
        return response
        
    except Exception as e:
        logger.exception("Logout failed")
        return jsonify({'success': False, 'msg': 'internal server error'}), HTTPStatus.INTERNAL_SERVER_ERROR