from datetime import datetime, timezone
import uuid

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import UUID, MetaData
from werkzeug.security import check_password_hash, generate_password_hash

metadata = MetaData(naming_convention={
    "ix": "ix_%(table_name)s_%(column_0_name)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
})

db = SQLAlchemy(metadata=metadata)

class TimeStampMixin:
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(tz=timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=True, onupdate=lambda: datetime.now(tz=timezone.utc))
    
class User(TimeStampMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = db.Column(db.String, nullable=False)
    last_name = db.Column(db.String, nullable=False)
    email = db.Column(db.String, nullable=False, unique=True)
    role = db.Column(db.Enum('field_agent', 'admin', name='user_role'), nullable=False)
    password_hash = db.Column(db.String, nullable=False)
    
    created_fields = db.relationship("Field", foreign_keys="Field.created_by", back_populates="creator", cascade="all, delete-orphan")
    assigned_fields = db.relationship("Field", foreign_keys="Field.assigned_agent_id", back_populates="assigned_agent")
    
    def hash_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    

class Field(TimeStampMixin, db.Model):
    __tablename__ = 'fields'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String, nullable=False)
    crop_type = db.Column(db.String, nullable=False)
    planting_date = db.Column(db.Date, nullable=False)
    expected_harvest_month = db.Column(db.Integer, nullable=False)
    expected_harvest_year = db.Column(db.Integer, nullable=False)
    current_stage = db.Column(db.Enum('planted', 'growing', 'ready', 'harvested', name='field_stage'), nullable=False, default='planted')    
    assigned_agent_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    creator = db.relationship("User", foreign_keys=[created_by], back_populates="created_fields")
    assigned_agent = db.relationship("User", foreign_keys=[assigned_agent_id], back_populates="assigned_fields")
    updates = db.relationship("FieldUpdate", back_populates="field", cascade="all, delete-orphan")

    @property
    def status(self):
        if self.current_stage == 'harvested':
            return 'completed'
        
        now = datetime.now(timezone.utc)
        current_year = now.year
        current_month = now.month
        
        if self.expected_harvest_year and self.expected_harvest_month:
            if (current_year > self.expected_harvest_year) or (current_year == self.expected_harvest_year and current_month > self.expected_harvest_month):
                return 'at risk'
            
        last_change = self.updated_at or self.created_at
        if (now - last_change).days > 30:
            return 'at risk'
        
        return 'active'
    

class FieldUpdate(TimeStampMixin, db.Model):
    __tablename__ = "field_updates"
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    field_id = db.Column(UUID(as_uuid=True), db.ForeignKey('fields.id', ondelete='CASCADE'), nullable=False)
    updated_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    new_stage = db.Column(db.Enum('planted', 'growing', 'ready', 'harvested', name="new_field_update_stage"), nullable=False)
    notes = db.Column(db.String, nullable=True)
    
    field = db.relationship("Field", foreign_keys=[field_id], back_populates="updates")
    agent = db.relationship("User", foreign_keys=[updated_by])