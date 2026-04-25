
# Design Decisions & Business Logic

To ensure the SmartSeason Field Monitoring System remains robust, intuitive, and aligned with standard agricultural practices, the following architectural and design decisions were implemented:

## 1. Harvest Targeting (Month/Year vs. Exact Date)

Instead of forcing users to predict an exact `expected_harvest_date`, the system tracks `expected_harvest_month` (1-12) and `expected_harvest_year`. 

* **Why:** Real-world agriculture is heavily dependent on unpredictable environmental factors. Exact-day harvest predictions are rarely accurate, whereas monthly targeting aligns with standard logistics and seasonal planning.
* **Implementation:** The backend utilizes a translation map to gracefully accept both integer inputs (e.g., `10`) and string names (e.g., `"October"`, `"oct"`) from the frontend.

## 2. Computed Field Status

The field `status` (`Active`, `At Risk`, `Completed`) is dynamically computed at runtime rather than stored as a static database column. 

* **Completed:** Automatically triggered when a field's stage is updated to `Harvested`.
* **At Risk:** Triggered dynamically if the current date surpasses the target harvest year/month, OR if the field experiences "stagnation" (no stage updates or notes recorded in over 30 days).
* **Active:** The default state for any field actively progressing within its expected timeline.

## 3. Strict Separation of Concerns (RBAC)

Role-Based Access Control (RBAC) was implemented strictly to enforce business logic:

* **Admins** have global visibility and can reassign agents, but are programmatically locked out of updating field stages or adding field notes.
* **Field Agents** can update stages and add notes, but their data queries are scoped exclusively to fields assigned to their UUID.
* **Why:** This prevents Coordinators from accidentally overwriting ground-truth data that should only come from Agents in the field.

## 4. Seamless Agent Onboarding

Instead of a public registration page, Field Agents are provisioned securely by the Admin.

* **Why:** This prevents unauthorized access to the internal field system.
* **Implementation:** When an Admin assigns a new email to a field, the system automatically provisions an account with a highly secure placeholder password and utilizes the Resend API to email the agent a 2-hour expiring secure token to set their credentials.

## 5. Cascading Deletions vs. Data Retention

Database-level foreign key constraints were carefully chosen to balance data integrity with historical retention:

* `ondelete='CASCADE'`: If an Admin or a Field is deleted, all associated `FieldUpdates` (history logs) are wiped to prevent orphaned data.
* `ondelete='SET NULL'`: If a Field Agent leaves the company and their account is deleted, their assigned fields are *not* deleted. Instead, the `assigned_agent_id` is set to `NULL`, retaining the field data for the Admin to reassign.

---

## Assumptions Made

During development, a few practical assumptions were made to prioritize functional clarity:

1. **Agent Provisioning over Public Signup:** I assumed that an enterprise monitoring system would not allow public, self-serve registration for Field Agents. Therefore, all agent accounts must be created by an Admin (either independently or during field creation).
2. **Standardized Date Formats:** I assumed the frontend will utilize standard HTML5 date pickers, so the backend API strictly parses incoming date strings in the ISO standard `YYYY-MM-DD` format to prevent timezone and localization parsing errors.
3. **Stateless Authentication:** I assumed a stateless JWT architecture via `HttpOnly` cookies would be sufficient for session management, prioritizing speed and simplicity over a stateful Redis-backed session store. Logout functionality assumes client-side cookie destruction is adequate.
4. **Dashboard Insights:** I assumed the Coordinator would value actionable metrics. The `/dashboard` endpoint doesn't just return counts; it actively scans the computed statuses to return an array of specific fields that require immediate attention.
