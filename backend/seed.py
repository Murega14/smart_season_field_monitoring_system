import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.exc import IntegrityError

from app import create_app
from app.models import db, User, Field, FieldUpdate

app = create_app()

def seed_database():
    with app.app_context():
        admin_email = "admin@smartseason.com"
        admin = User.query.filter_by(email=admin_email).first()
        
        if not admin:
            admin = User(
                first_name="System",
                last_name="Coordinator",
                email=admin_email,
                role="admin"
            )
            admin.hash_password("admin123")
            db.session.add(admin)
            db.session.commit()
            print(f"✅ Created Admin: {admin_email} (Password: admin123)")
        else:
            print(f"⚡ Admin {admin_email} already exists.")

        agents_data = [
            {"first_name": "John", "last_name": "Doe", "email": "john.agent@smartseason.com"},
            {"first_name": "Jane", "last_name": "Smith", "email": "jane.agent@smartseason.com"}
        ]
        
        created_agents = []
        for agent_data in agents_data:
            agent = User.query.filter_by(email=agent_data['email']).first()
            if not agent:
                agent = User(
                    first_name=agent_data['first_name'],
                    last_name=agent_data['last_name'],
                    email=agent_data['email'],
                    role="field_agent"
                )
                agent.hash_password("agent123")
                db.session.add(agent)
                db.session.commit()
                print(f"✅ Created Agent: {agent.email} (Password: agent123)")
            else:
                print(f"⚡ Agent {agent.email} already exists.")
            created_agents.append(agent)

        if not Field.query.first():
            now = datetime.now(timezone.utc)
            
            fields_data = [
                {
                    "name": "North Block A",
                    "crop_type": "Corn",
                    "planting_date": (now - timedelta(days=10)).date(),
                    "expected_harvest_month": (now + timedelta(days=90)).month,
                    "expected_harvest_year": (now + timedelta(days=90)).year,
                    "current_stage": "planted",
                    "assigned_agent_id": created_agents[0].id,
                    "created_by": admin.id
                },
                {
                    "name": "East Valley Field",
                    "crop_type": "Wheat",
                    "planting_date": (now - timedelta(days=45)).date(),
                    "expected_harvest_month": (now + timedelta(days=30)).month,
                    "expected_harvest_year": (now + timedelta(days=30)).year,
                    "current_stage": "growing",
                    "assigned_agent_id": created_agents[0].id,
                    "created_by": admin.id
                },
                {
                    "name": "South Riverside",
                    "crop_type": "Soybeans",
                    "planting_date": (now - timedelta(days=100)).date(),
                    "expected_harvest_month": now.month,
                    "expected_harvest_year": now.year,
                    "current_stage": "ready",
                    "assigned_agent_id": created_agents[1].id,
                    "created_by": admin.id
                },
                {
                    "name": "West Hill Plot",
                    "crop_type": "Tomatoes",
                    "planting_date": (now - timedelta(days=150)).date(),
                    "expected_harvest_month": (now - timedelta(days=10)).month,
                    "expected_harvest_year": (now - timedelta(days=10)).year,
                    "current_stage": "growing", 
                    "assigned_agent_id": created_agents[1].id,
                    "created_by": admin.id
                }
            ]

            created_fields = []
            for f_data in fields_data:
                field = Field(**f_data)
                db.session.add(field)
                created_fields.append(field)
                
            db.session.commit()

            updates_data = [
                FieldUpdate(
                    field_id=created_fields[1].id,
                    updated_by=created_agents[0].id,
                    new_stage="growing",
                    notes="Sprouts are looking healthy. Good rainfall this week."
                ),
                FieldUpdate(
                    field_id=created_fields[2].id,
                    updated_by=created_agents[1].id,
                    new_stage="ready",
                    notes="Crop has reached maturity. Scheduling harvest equipment for next week."
                ),
                FieldUpdate(
                    field_id=created_fields[3].id,
                    updated_by=created_agents[1].id,
                    new_stage="growing",
                    notes="Noticed some minor pest damage on the southern edge. Applying organic deterrent."
                )
            ]

            db.session.add_all(updates_data)
            db.session.commit()
            print("✅ Created Field Update History logs")

        else:
            print("⚡ Fields already exist in the database. Skipping field creation.")


if __name__ == "__main__":
    seed_database()