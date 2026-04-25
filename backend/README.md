# SmartSeason Field Monitoring System — Backend

A REST API built with Flask for tracking crop progress across multiple fields during a growing season. Supports two user roles — **Admin** and **Field Agent** — with JWT-based authentication.

---

## Prerequisites

- Python 3.10+
- PostgreSQL
- A [Resend](https://resend.com) account (for transactional emails)

---

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd <repository-folder>
```

### 2. Create and activate a virtual environment

```bash
python -m venv venv
source venv/bin/activate        # macOS/Linux
venv\Scripts\activate           # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in the root directory:

```env
FLASK_APP=app.py
FLASK_ENV=development

DATABASE_URL=postgresql://user:password@localhost:5432/smartseason

SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret-key

RESEND_API_KEY=your-resend-api-key
FRONTEND_URL=http://localhost:3000
```

### 5. Set up the database

```bash
flask db init
flask db migrate -m "initial migration"
flask db upgrade
```

### 6. Run the development server

```bash
python app.py
```

The API will be available at `http://localhost:8000`.

---

## Demo Credentials

> These are created by calling the `/api/v1/auth/signup` endpoint directly.
> Field agent accounts are created by admins via the assign-agent endpoint.

| Role        | Email                      | Password      |
|-------------|----------------------------|---------------|
| Admin       | admin@example.com          | admin1234     |
| Field Agent | agent@example.com          | agent1234     |

---

## Authentication

All protected endpoints require a valid JWT, stored as an **`httponly` cookie** named `access_token`. This is set automatically on login and signup.

Tokens expire after **12 hours**.

---

## API Reference

**Base URL:** `/api/v1`

---

### Auth

#### `POST /auth/signup`
Creates a new admin account.

**Request body:**
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@example.com",
  "password": "securepassword"
}
```

**Responses:**
| Status | Description |
|--------|-------------|
| `201`  | Account created, access token cookie set |
| `400`  | Missing fields or invalid email format |
| `409`  | Email already in use |

---

#### `POST /auth/login`
Authenticates a user and sets the access token cookie.

**Request body:**
```json
{
  "email": "jane@example.com",
  "password": "securepassword"
}
```

**Responses:**
| Status | Description |
|--------|-------------|
| `200`  | Login successful, access token cookie set |
| `400`  | Invalid credentials |

---

#### `POST /auth/logout`
Clears the access token cookie and unsets JWT cookies.

**Auth required:** Yes

**Responses:**
| Status | Description |
|--------|-------------|
| `200`  | Logged out successfully |

---

#### `POST /auth/forgot-password`
Sends a password reset link to the provided email if an account exists.

> Always returns `200` regardless of whether the email exists, to prevent account enumeration.

**Request body:**
```json
{
  "email": "jane@example.com"
}
```

**Responses:**
| Status | Description |
|--------|-------------|
| `200`  | Reset link sent (if account exists) |
| `400`  | Invalid email format |

---

#### `POST /auth/reset-password/:token`
Resets a user's password using a valid reset token.

Reset tokens expire in **~8 minutes**.

**Request body:**
```json
{
  "password": "newpassword123"
}
```

**Responses:**
| Status | Description |
|--------|-------------|
| `200`  | Password reset successfully |
| `400`  | Token is invalid or expired |

---

### Fields

All field endpoints require authentication. Role-based access is enforced per endpoint.

---

#### `GET /fields/dashboard`
Returns a summary of fields and key insights for the authenticated user.

- **Admin** sees fields they created.
- **Field Agent** sees fields assigned to them.

**Auth required:** Yes (any role)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_fields": 10,
    "status_breakdown": {
      "active": 6,
      "at risk": 3,
      "completed": 1
    },
    "insights": {
      "action_required": [
        { "id": "uuid", "name": "North Plot", "stage": "growing" }
      ],
      "upcoming_harvests_this_month": 2
    }
  }
}
```

---

#### `GET /fields/agents`
Returns a list of all field agents. Used to populate agent selection dropdowns when assigning or reassigning fields.

**Auth required:** Yes — **Admin only**

**Response:**
```json
{
  "success": true,
  "agents": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Kamau",
      "email": "john@example.com",
      "assigned_fields_count": 3
    }
  ]
}
```

---

#### `GET /fields/`
Returns all fields belonging to the authenticated user.

- **Admin** sees fields they created.
- **Field Agent** sees fields assigned to them.

**Auth required:** Yes (any role)

**Response:**
```json
{
  "success": true,
  "fields": [
    {
      "id": "uuid",
      "name": "South Block",
      "crop_type": "Maize",
      "current_stage": "growing",
      "status": "active",
      "planting_date": "2025-01-15T00:00:00+00:00",
      "expected_harvest_month": 6,
      "expected_harvest_year": 2025,
      "assigned_agent_id": "uuid",
      "assigned_agent_name": "John Kamau"
    }
  ]
}
```

---

#### `POST /fields/create`
Creates a new field.

**Auth required:** Yes — **Admin only**

**Request body:**
```json
{
  "name": "South Block",
  "crop_type": "Maize",
  "planting_date": "15-01-2025",
  "expected_harvest_month": "june",
  "expected_harvest_year": 2025,
  "current_stage": "planted"
}
```

> `planting_date` must be in `DD-MM-YYYY` format.
> `expected_harvest_month` accepts full month names (`january`) or abbreviations (`jan`).
> `current_stage` must be one of: `planted`, `growing`, `ready`, `harvested`.

**Responses:**
| Status | Description |
|--------|-------------|
| `201`  | Field created successfully |
| `400`  | Missing or invalid fields |

---

#### `GET /fields/:field_id`
Returns full detail for a single field.

- Admins can only fetch fields they created.
- Field agents can only fetch fields assigned to them.

**Auth required:** Yes (any role)

**Response:**
```json
{
  "success": true,
  "field": {
    "id": "uuid",
    "name": "South Block",
    "crop_type": "Maize",
    "planting_date": "2025-01-15T00:00:00+00:00",
    "expected_harvest_month": 6,
    "expected_harvest_year": 2025,
    "current_stage": "growing",
    "status": "active",
    "assigned_agent_id": "uuid",
    "assigned_agent_name": "John Kamau",
    "created_at": "2025-01-10T08:00:00+00:00",
    "updated_at": "2025-03-01T12:00:00+00:00"
  }
}
```

**Responses:**
| Status | Description |
|--------|-------------|
| `200`  | Field detail returned |
| `403`  | You do not have permission to view this field |
| `404`  | Field not found |

---

#### `PATCH /fields/:field_id/edit`
Updates a field's metadata. Only the admin who created the field can edit it. All fields are optional — only include what needs to change.

**Auth required:** Yes — **Admin only**

**Request body (all fields optional):**
```json
{
  "name": "Updated Name",
  "crop_type": "Sorghum",
  "planting_date": "20-02-2025",
  "expected_harvest_month": "august",
  "expected_harvest_year": 2025
}
```

**Responses:**
| Status | Description |
|--------|-------------|
| `200`  | Field updated successfully |
| `400`  | Invalid field values |
| `403`  | You do not own this field |
| `404`  | Field not found |

---

#### `PATCH /fields/:field_id`
Allows a field agent to update the stage of their assigned field and add notes.

**Auth required:** Yes — **Field Agent only**

**Request body:**
```json
{
  "new_stage": "growing",
  "notes": "Crop is developing well, no pest activity observed."
}
```

> `new_stage` is optional. If omitted, a log entry is created with the current stage and only the notes are recorded.
> `new_stage` must be one of: `planted`, `growing`, `ready`, `harvested`.

**Responses:**
| Status | Description |
|--------|-------------|
| `200`  | Field updated and update log created |
| `400`  | Invalid stage value |
| `403`  | You are not assigned to this field |
| `404`  | Field not found |

---

#### `POST /fields/:field_id/assign-agent`
Assigns a field agent to a field. Supports two flows:

1. **Assign an existing agent** — provide `agent_id`.
2. **Create a new agent and assign them** — provide `first_name`, `last_name`, and `email`. A placeholder password is set and a set-password link is emailed to the agent.

Only the admin who created the field can assign agents to it.

**Auth required:** Yes — **Admin only**

**Request body (existing agent):**
```json
{
  "agent_id": "uuid"
}
```

**Request body (new agent):**
```json
{
  "first_name": "John",
  "last_name": "Kamau",
  "email": "john@example.com"
}
```

**Responses:**
| Status | Description |
|--------|-------------|
| `200`  | Existing agent assigned to field |
| `201`  | New agent account created and assigned |
| `400`  | Invalid email format |
| `403`  | You do not own this field |
| `404`  | Field not found |
| `409`  | Email already in use |

---

#### `PATCH /fields/:field_id/reassign`
Reassigns a field to a different existing field agent.

**Auth required:** Yes — **Admin only**

**Request body:**
```json
{
  "new_agent_id": "uuid"
}
```

**Responses:**
| Status | Description |
|--------|-------------|
| `200`  | Field reassigned successfully |
| `400`  | `new_agent_id` missing or invalid format |
| `404`  | Field or agent not found |

---

#### `GET /fields/:field_id/updates`
Returns the update history for a field, ordered from most recent to oldest.

- Admins can view updates for fields they created.
- Field agents can view updates for fields assigned to them.

**Auth required:** Yes (any role)

**Response:**
```json
{
  "success": true,
  "updates": [
    {
      "id": "uuid",
      "new_stage": "growing",
      "notes": "Crop developing well.",
      "created_at": "2025-03-01T12:00:00+00:00",
      "updated_by_name": "John Kamau"
    }
  ]
}
```

**Responses:**
| Status | Description |
|--------|-------------|
| `200`  | Update history returned |
| `403`  | You do not have permission to view these updates |
| `404`  | Field not found |

---

#### `DELETE /fields/:field_id`
Permanently deletes a field and all its associated update records.

**Auth required:** Yes — **Admin only**

**Responses:**
| Status | Description |
|--------|-------------|
| `200`  | Field deleted successfully |
| `404`  | Field not found |

---

## Field Status Logic

Each field has a computed `status` property derived from its data:

| Status      | Condition |
|-------------|-----------|
| `completed` | `current_stage` is `harvested` |
| `at risk`   | Past the expected harvest month/year, or no update activity in over 30 days |
| `active`    | All other cases |

---

## Endpoint Summary

| Method   | Endpoint                              | Role         | Description                        |
|----------|---------------------------------------|--------------|------------------------------------|
| `POST`   | `/auth/signup`                        | Public       | Create admin account               |
| `POST`   | `/auth/login`                         | Public       | Login                              |
| `POST`   | `/auth/logout`                        | Any          | Logout                             |
| `POST`   | `/auth/forgot-password`               | Public       | Request password reset email       |
| `POST`   | `/auth/reset-password/:token`         | Public       | Reset password with token          |
| `GET`    | `/fields/dashboard`                   | Any          | Dashboard stats and insights       |
| `GET`    | `/fields/agents`                      | Admin        | List all field agents              |
| `GET`    | `/fields/`                            | Any          | List own fields                    |
| `POST`   | `/fields/create`                      | Admin        | Create a new field                 |
| `GET`    | `/fields/:field_id`                   | Any          | Get single field detail            |
| `PATCH`  | `/fields/:field_id/edit`              | Admin        | Edit field metadata                |
| `PATCH`  | `/fields/:field_id`                   | Field Agent  | Update field stage / add notes     |
| `POST`   | `/fields/:field_id/assign-agent`      | Admin        | Assign or create and assign agent  |
| `PATCH`  | `/fields/:field_id/reassign`          | Admin        | Reassign field to another agent    |
| `GET`    | `/fields/:field_id/updates`           | Any          | View field update history          |
| `DELETE` | `/fields/:field_id`                   | Admin        | Delete a field                     |