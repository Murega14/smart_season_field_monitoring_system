from datetime import datetime, timezone
from http import HTTPStatus
import os
import secrets
import uuid

from dotenv import load_dotenv
from email_validator import EmailNotValidError, validate_email
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
import resend
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.models import Field, FieldUpdate, User, db
from app.utils import get_reset_token, setup_logging
from app.wrappers import admin_required, field_agent_required

load_dotenv()

fields_bp = Blueprint('fields_bp', __name__, url_prefix='/api/v1/fields')

MONTH_MAP = {
    'january': 1, 'jan': 1,
    'february': 2, 'feb': 2,
    'march': 3, 'mar': 3,
    'april': 4, 'apr': 4,
    'may': 5,
    'june': 6, 'jun': 6,
    'july': 7, 'jul': 7,
    'august': 8, 'aug': 8,
    'september': 9, 'sep': 9,
    'october': 10, 'oct': 10,
    'november': 11, 'nov': 11,
    'december': 12, 'dec': 12
}

FIELD_STAGES = ['planted', 'growing', 'ready', 'harvested',]

logger = setup_logging()

FRONTEND_URL = os.getenv("FRONTEND_URL")
resend.api_key = os.getenv("RESEND_API_KEY")


@fields_bp.route('/create', methods=['POST'])
@jwt_required()
@admin_required
def create_field():
    try:
        data = request.get_json()
        name = data.get('name')
        crop_type = data.get('crop_type')
        planting_date = data.get('planting_date')
        expected_harvest_month = data.get('expected_harvest_month').strip().lower()
        expected_harvest_year = data.get('expected_harvest_year')
        current_stage = data.get('current_stage').lower()
        
        user_id = uuid.UUID(get_jwt_identity())
        
        formatted_planting_date = datetime.strptime(planting_date, '%d-%m-%Y').replace(tzinfo=timezone.utc)
        
        exp_month = None
        exp_year = None
        
        if expected_harvest_month is not None:
            exp_month = MONTH_MAP.get(expected_harvest_month)
            
        if expected_harvest_year is not None:
            exp_year = int(expected_harvest_year)
            current_year = datetime.now(timezone.utc).year
            
            if exp_year < current_year:
                return jsonify({'error': 'expected harvest year cannot be in the past'}), HTTPStatus.BAD_REQUEST
        
        if current_stage not in FIELD_STAGES:   
            return jsonify({'error': f'field stage can only be {" ".join(FIELD_STAGES)}'}), HTTPStatus.BAD_REQUEST
        
        try:
            new_field = Field(
                name=name,
                crop_type=crop_type,
                planting_date=formatted_planting_date,
                expected_harvest_month=exp_month,
                expected_harvest_year=exp_year,
                current_stage=current_stage,
                created_by=user_id,
            )
            
            db.session.add(new_field)
            db.session.commit()
            
            logger.info("new field %s created by %s", new_field.name, user_id)
            return jsonify({'success': True, 'msg': 'field created successfully'}), HTTPStatus.CREATED
        
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("database error occurred trying to create a new field")
            return jsonify({'success': False, 'msg': 'an error occurred, please try again'}), HTTPStatus.INTERNAL_SERVER_ERROR
        
    except Exception:
        logger.exception("field creation endpoint error")
        return jsonify({'error': 'internal server error'}), HTTPStatus.INTERNAL_SERVER_ERROR
    

@fields_bp.route('/<uuid:field_id>/assign-agent', methods=['POST'])
@jwt_required()
@admin_required
def assign_agent_to_field(field_id):
    try:
        data = request.get_json()
        field_agent_id = data.get('agent_id')
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        email = data.get('email')
        
        user_id = uuid.UUID(get_jwt_identity())
                
        field = db.session.get(Field, field_id)
        
        if not field:
            return jsonify({'error': 'field does not exist'}), HTTPStatus.NOT_FOUND
        
        if field.created_by != user_id:
            return jsonify({'error': 'you do not own this field'}), HTTPStatus.FORBIDDEN
        
        if field_agent_id:
            try:
                field.assigned_agent_id = field_agent_id
                db.session.commit()
                
                logger.info("agent %s assigned to %s", field_agent_id, field.name)
                return jsonify({'success': True, 'msg': 'field agent assigned to field'}), HTTPStatus.OK
            
            except SQLAlchemyError:
                db.session.rollback()
                logger.exception("database error trying to assign field to existing agent")
                return jsonify({'success': False, 'msg': 'an error occurred, please try again'}), HTTPStatus.INTERNAL_SERVER_ERROR
            
        if email:
            try:
                validate_email(email)
            except EmailNotValidError:
                return jsonify({'error': 'invalid email format'}), HTTPStatus.BAD_REQUEST
            
        try:
            new_user = User(
                first_name=first_name,
                last_name=last_name,
                email=email,
                role='field_agent',
            )
            db.session.add(new_user)
            
            placeholder_pwd = secrets.token_urlsafe(32)
            new_user.hash_password(placeholder_pwd)
            
            db.session.flush()
            
            field.assigned_agent_id = new_user.id
            db.session.commit()
            
            token = get_reset_token(email=new_user.email, expires_in=7200)
            set_password_link = f"{FRONTEND_URL}/set-password/{token}"

            resend.Emails.send(
                {
                    "from": "onboarding@oldonyosabukprepsch.co.ke",
                    "to": new_user.email,
                    "subject": "You've been assigned to a Field",
                    "html": f"""
                    <p>Hi {new_user.first_name},</p>
                    <p>Your account on Smart Field Monitoring System has been created.
                    Click the link below to set your password:</p>
                    <a href="{set_password_link}">Set Password</a>
                    <p>This link expires in 2 hours.</p>
                    """,
                    }
                )
            
            logger.info("new agent account created, and assigned to field")
            return jsonify({'success': True, 'msg': 'field agent account created and credentials emailed to their email'}), HTTPStatus.CREATED
        
        except IntegrityError:
            db.session.rollback()
            logger.exception("unique constraint violation")
            return jsonify({'error': 'email is associated with another account'}), HTTPStatus.CONFLICT
        
        except SQLAlchemyError:
            db.session.rollback()
            logger.info("database error occurred trying to create and assign field agent ")
            return jsonify({'success': False, 'msg': 'an error occurred, please try again'}), HTTPStatus.INTERNAL_SERVER_ERROR
        
    except Exception:
        logger.exception("an error occurred in the assign agent endpoint")
        return jsonify({'error': 'internal server error'}), HTTPStatus.INTERNAL_SERVER_ERROR


@fields_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    try:
        user_id_str = get_jwt_identity()
        user_id = uuid.UUID(user_id_str)
        
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({'error': 'User not found'}), HTTPStatus.NOT_FOUND

        if user.role == 'admin':
            fields = Field.query.filter_by(created_by=user_id).order_by(Field.created_at.desc()).all()
        else:
            fields = Field.query.filter_by(assigned_agent_id=user_id).order_by(Field.created_at.desc()).all()

        total_fields = len(fields)
        status_breakdown = {
            'active': 0,
            'at risk': 0,
            'completed': 0
        }
        
        at_risk_details = []
        upcoming_harvests = 0
        
        current_month = datetime.now(timezone.utc).month
        current_year = datetime.now(timezone.utc).year

        for f in fields:
            current_status = f.status
            status_breakdown[current_status] += 1
            
            if current_status == 'at risk':
                at_risk_details.append({
                    'id': str(f.id),
                    'name': f.name,
                    'stage': f.current_stage
                })
                
            if f.expected_harvest_month == current_month and f.expected_harvest_year == current_year and current_status != 'completed':
                upcoming_harvests += 1

        return jsonify({
            'success': True,
            'data': {
                'total_fields': total_fields,
                'status_breakdown': status_breakdown,
                'insights': {
                    'action_required': at_risk_details,
                    'upcoming_harvests_this_month': upcoming_harvests
                }
            }
        }), HTTPStatus.OK

    except Exception:
        logger.exception("Error generating dashboard stats")
        return jsonify({'error': 'Internal server error'}), HTTPStatus.INTERNAL_SERVER_ERROR


@fields_bp.route('/agents', methods=['GET'])
@jwt_required()
@admin_required
def get_agents():
    try:
        agents = User.query.filter_by(role='field_agent').order_by(User.first_name).all()

        agent_list = [{
            'id': str(a.id),
            'first_name': a.first_name,
            'last_name': a.last_name,
            'email': a.email,
            'assigned_fields_count': len(a.assigned_fields),
        } for a in agents]

        return jsonify({'success': True, 'agents': agent_list}), HTTPStatus.OK

    except Exception:
        logger.exception("Error fetching agents")
        return jsonify({'error': 'Internal server error'}), HTTPStatus.INTERNAL_SERVER_ERROR


@fields_bp.route('/', methods=['GET'])
@jwt_required()
def get_fields():
    try:
        user_id_str = get_jwt_identity()
        user_id = uuid.UUID(user_id_str)
        
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({'error': 'User not found'}), HTTPStatus.NOT_FOUND

        if user.role == 'admin':
            fields = Field.query.filter_by(created_by=user_id).order_by(Field.created_at.desc()).all()
        else:
            fields = Field.query.filter_by(assigned_agent_id=user_id).order_by(Field.created_at.desc()).all()

        field_list = [{
            'id': str(f.id),
            'name': f.name,
            'crop_type': f.crop_type,
            'current_stage': f.current_stage,
            'status': f.status,
            'planting_date': f.planting_date.isoformat() if f.planting_date else None,
            'expected_harvest_month': f.expected_harvest_month,
            'expected_harvest_year': f.expected_harvest_year,
            'assigned_agent_id': str(f.assigned_agent_id) if f.assigned_agent_id else None,
            'assigned_agent_name': f"{f.assigned_agent.first_name} {f.assigned_agent.last_name}" if f.assigned_agent else None,
        } for f in fields]

        return jsonify({'success': True, 'fields': field_list}), HTTPStatus.OK

    except Exception:
        logger.exception("Error fetching fields")
        return jsonify({'error': 'Internal server error'}), HTTPStatus.INTERNAL_SERVER_ERROR


@fields_bp.route('/<uuid:field_id>', methods=['GET'])
@jwt_required()
def get_field(field_id):
    try:
        user_id = uuid.UUID(get_jwt_identity())
        user = db.session.get(User, user_id)
        field = db.session.get(Field, field_id)

        if not field:
            return jsonify({'error': 'Field not found'}), HTTPStatus.NOT_FOUND

        if user.role == 'admin' and field.created_by != user_id:
            return jsonify({'error': 'You do not have permission to view this field'}), HTTPStatus.FORBIDDEN

        if user.role == 'field_agent' and field.assigned_agent_id != user_id:
            return jsonify({'error': 'You are not assigned to this field'}), HTTPStatus.FORBIDDEN

        return jsonify({
            'success': True,
            'field': {
                'id': str(field.id),
                'name': field.name,
                'crop_type': field.crop_type,
                'planting_date': field.planting_date.isoformat() if field.planting_date else None,
                'expected_harvest_month': field.expected_harvest_month,
                'expected_harvest_year': field.expected_harvest_year,
                'current_stage': field.current_stage,
                'status': field.status,
                'assigned_agent_id': str(field.assigned_agent_id) if field.assigned_agent_id else None,
                'assigned_agent_name': f"{field.assigned_agent.first_name} {field.assigned_agent.last_name}" if field.assigned_agent else None,
                'created_at': field.created_at.isoformat(),
                'updated_at': field.updated_at.isoformat() if field.updated_at else None,
            }
        }), HTTPStatus.OK

    except Exception:
        logger.exception("Error fetching field detail")
        return jsonify({'error': 'Internal server error'}), HTTPStatus.INTERNAL_SERVER_ERROR


@fields_bp.route('/<uuid:field_id>/edit', methods=['PATCH'])
@jwt_required()
@admin_required
def edit_field(field_id):
    try:
        user_id = uuid.UUID(get_jwt_identity())
        field = db.session.get(Field, field_id)

        if not field:
            return jsonify({'error': 'Field not found'}), HTTPStatus.NOT_FOUND

        if field.created_by != user_id:
            return jsonify({'error': 'You do not have permission to edit this field'}), HTTPStatus.FORBIDDEN

        data = request.get_json()

        if 'name' in data:
            name = data['name'].strip()
            if not name:
                return jsonify({'error': 'Field name cannot be empty'}), HTTPStatus.BAD_REQUEST
            field.name = name

        if 'crop_type' in data:
            crop_type = data['crop_type'].strip()
            if not crop_type:
                return jsonify({'error': 'Crop type cannot be empty'}), HTTPStatus.BAD_REQUEST
            field.crop_type = crop_type

        if 'planting_date' in data:
            try:
                field.planting_date = datetime.strptime(data['planting_date'], '%d-%m-%Y').replace(tzinfo=timezone.utc)
            except ValueError:
                return jsonify({'error': 'planting_date must be in DD-MM-YYYY format'}), HTTPStatus.BAD_REQUEST

        if 'expected_harvest_month' in data:
            month_val = data['expected_harvest_month']
            if isinstance(month_val, str):
                month_val = MONTH_MAP.get(month_val.strip().lower())
                if not month_val:
                    return jsonify({'error': 'Invalid expected_harvest_month'}), HTTPStatus.BAD_REQUEST
            field.expected_harvest_month = month_val

        if 'expected_harvest_year' in data:
            exp_year = int(data['expected_harvest_year'])
            current_year = datetime.now(timezone.utc).year
            if exp_year < current_year:
                return jsonify({'error': 'expected harvest year cannot be in the past'}), HTTPStatus.BAD_REQUEST
            field.expected_harvest_year = exp_year

        try:
            db.session.commit()
            logger.info("Field %s updated by admin %s", field_id, user_id)
            return jsonify({'success': True, 'msg': 'Field updated successfully'}), HTTPStatus.OK

        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Database error during field edit")
            return jsonify({'error': 'Database error occurred'}), HTTPStatus.INTERNAL_SERVER_ERROR

    except Exception:
        logger.exception("Error editing field")
        return jsonify({'error': 'Internal server error'}), HTTPStatus.INTERNAL_SERVER_ERROR


@fields_bp.route('/<uuid:field_id>', methods=['PATCH'])
@jwt_required()
@field_agent_required
def update_field(field_id):
    try:
        data = request.get_json()
        new_stage = data.get('new_stage', '').lower()
        notes = data.get('notes')
        
        user_id_str = get_jwt_identity()
        user_id = uuid.UUID(user_id_str)
        field = db.session.get(Field, field_id)
        
        if not field:
            return jsonify({'error': 'Field not found'}), HTTPStatus.NOT_FOUND

        if field.assigned_agent_id != user_id:
            return jsonify({'error': 'You are not assigned to this field.'}), HTTPStatus.FORBIDDEN
            
        if new_stage and new_stage not in FIELD_STAGES:
            return jsonify({'error': 'Invalid field stage'}), HTTPStatus.BAD_REQUEST

        try:
            if new_stage:
                field.current_stage = new_stage
                
            update_log = FieldUpdate(
                field_id=field.id,
                updated_by=user_id,
                new_stage=new_stage or field.current_stage, 
                notes=notes
            )
            
            db.session.add(update_log)
            db.session.commit()
            
            return jsonify({'success': True, 'msg': 'Field updated successfully'}), HTTPStatus.OK
            
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Database error during field update")
            return jsonify({'error': 'Database error occurred'}), HTTPStatus.INTERNAL_SERVER_ERROR

    except Exception:
        logger.exception("Error updating field")
        return jsonify({'error': 'Internal server error'}), HTTPStatus.INTERNAL_SERVER_ERROR  
    

@fields_bp.route('/<uuid:field_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_field(field_id):
    try:
        field = db.session.get(Field, field_id)
        
        if not field:
            return jsonify({'error': 'Field not found'}), HTTPStatus.NOT_FOUND

        try:
            db.session.delete(field)
            db.session.commit()
            
            logger.info("Field %s deleted by admin", field_id)
            return jsonify({'success': True, 'msg': 'Field deleted successfully'}), HTTPStatus.OK
            
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Database error during field deletion")
            return jsonify({'error': 'Database error occurred'}), HTTPStatus.INTERNAL_SERVER_ERROR

    except Exception:
        logger.exception("Error deleting field")
        return jsonify({'error': 'Internal server error'}), HTTPStatus.INTERNAL_SERVER_ERROR

    
@fields_bp.route('/<uuid:field_id>/reassign', methods=['PATCH'])
@jwt_required()
@admin_required
def reassign_agent(field_id):
    try:
        data = request.get_json()
        new_agent_id_str = data.get('new_agent_id')
        
        if not new_agent_id_str:
            return jsonify({'error': 'new_agent_id is required'}), HTTPStatus.BAD_REQUEST
            
        try:
            new_agent_id = uuid.UUID(new_agent_id_str)
        except ValueError:
            return jsonify({'error': 'Invalid agent ID format'}), HTTPStatus.BAD_REQUEST

        field = db.session.get(Field, field_id)
        new_agent = db.session.get(User, new_agent_id)
        
        if not field:
            return jsonify({'error': 'Field not found'}), HTTPStatus.NOT_FOUND
            
        if not new_agent or new_agent.role != 'field_agent':
            return jsonify({'error': 'Valid Field Agent not found'}), HTTPStatus.NOT_FOUND

        try:
            field.assigned_agent_id = new_agent.id
            db.session.commit()
                        
            logger.info("Field %s reassigned to agent %s", field.name, new_agent.email)
            return jsonify({'success': True, 'msg': f'Field successfully reassigned to {new_agent.first_name}'}), HTTPStatus.OK
            
        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Database error during reassignment")
            return jsonify({'error': 'Database error occurred'}), HTTPStatus.INTERNAL_SERVER_ERROR

    except Exception:
        logger.exception("Error reassigning field")
        return jsonify({'error': 'Internal server error'}), HTTPStatus.INTERNAL_SERVER_ERROR

                
@fields_bp.route('/<uuid:field_id>/updates', methods=['GET'])
@jwt_required()
def get_field_updates(field_id):
    try:
        user_id_str = get_jwt_identity()
        user_id = uuid.UUID(user_id_str)
        
        user = db.session.get(User, user_id)
        field = db.session.get(Field, field_id)
        
        if not field:
            return jsonify({'error': 'Field not found'}), HTTPStatus.NOT_FOUND

        if user.role == 'admin' and field.created_by != user_id:
            return jsonify({'error': 'You do not have permission to view these updates'}), HTTPStatus.FORBIDDEN

        if user.role == 'field_agent' and field.assigned_agent_id != user_id:
            return jsonify({'error': 'You do not have permission to view these updates'}), HTTPStatus.FORBIDDEN

        updates = FieldUpdate.query.filter_by(field_id=field.id).order_by(FieldUpdate.created_at.desc()).all()
        
        update_list = [{
            'id': str(u.id),
            'new_stage': u.new_stage,
            'notes': u.notes,
            'created_at': u.created_at.isoformat(),
            'updated_by_name': f"{u.agent.first_name} {u.agent.last_name}" if u.agent else "Unknown Agent"
        } for u in updates]

        return jsonify({'success': True, 'updates': update_list}), HTTPStatus.OK

    except Exception:
        logger.exception("Error fetching field updates")
        return jsonify({'error': 'Internal server error'}), HTTPStatus.INTERNAL_SERVER_ERROR