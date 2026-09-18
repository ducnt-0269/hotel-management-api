# Function List

> The scope of what will be built. `pm-plan-schedule` (SCH) turns the function groups into WBS Epics and the
> functions into Stories, and writes the resulting story IDs back into "Related WBS ID".
> Per-function details (use cases, I/O, business rules) belong under `functions/` and are owned by the
> downstream `requirement-analysist` — leave "Detail document" blank or `TBD` here.
>
> Priority is carried over from the source requirement sheet: **highlighted rows → `must`**, plain rows in the
> Basic block → `should`, rows in the Advance block → `could`. Delivery is committed to `must` + `should`;
> `could` is pulled in only if time allows.

## 1. Function Groups

| FG-ID | Function group | Description |
| --- | --- | --- |
| FG-01 | Account & Authentication | Registering, signing in and out, self-service profile and password, and administrative management of user accounts |
| FG-02 | Room Catalogue | Browsing and searching the rooms on offer, and maintaining the room records behind them |
| FG-03 | Booking | The booking request lifecycle: raising a request, tracking it, cancelling it, and the operator's approval decision |
| FG-04 | Review | Guest reviews of rooms they have stayed in, and their moderation |
| FG-05 | Notification | Email the system sends on its own initiative, triggered by an event or a schedule rather than by a request |
| FG-06 | Reporting & Analytics | Exports and aggregate figures the operator reads to run the hotel |

## 2. Functions

| F-ID | FG-ID | Function name | Summary | Priority | Target roles | Related WBS ID | Detail document |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-001 | FG-01 | Register an account | A visitor creates an account with the credentials needed to sign in | must | ROLE-001 | | TBD |
| F-002 | FG-01 | Sign in / sign out | Exchange credentials for a session, and end that session on request | must | ROLE-002, ROLE-003 | | TBD |
| F-003 | FG-01 | View and edit own profile, change password | A signed-in user reads and updates their own details and rotates their password | should | ROLE-002, ROLE-003 | | TBD |
| F-004 | FG-01 | Manage users | The operator lists users, opens one, and activates or deactivates an account | should | ROLE-003 | | TBD |
| F-005 | FG-02 | View room list and room detail | Anyone can page through the rooms on offer and open one to see its full description | must | ROLE-001, ROLE-002, ROLE-003 | | TBD |
| F-006 | FG-02 | Search available rooms by date range and amenity | Find the rooms free across a requested stay, narrowed by amenities such as air conditioning, bed type or view | must | ROLE-001, ROLE-002 | | TBD |
| F-007 | FG-02 | Manage rooms (CRUD) | The operator creates, edits and removes the room records | should | ROLE-003 | | TBD |
| F-008 | FG-03 | Raise a booking request | A signed-in user requests a room for a stated arrival and departure date | must | ROLE-002 | | TBD |
| F-009 | FG-03 | View own booking history | A user reads back the requests they have raised and the state each one is in | must | ROLE-002 | | TBD |
| F-010 | FG-03 | Cancel an unconfirmed request | A user withdraws their own request while the operator has not yet decided on it | must | ROLE-002 | | TBD |
| F-011 | FG-03 | Approve or reject a booking request | The operator lists and opens requests and decides on them; a rejection carries a reason | must | ROLE-003 | | TBD |
| F-012 | FG-03 | Pay for a request | A user settles the amount due for their own booking | should | ROLE-002 | | TBD |
| F-013 | FG-04 | Review a room already booked | A user leaves a rating and comment for a room they have stayed in | should | ROLE-002 | | TBD |
| F-014 | FG-04 | Moderate reviews | The operator approves or rejects a submitted review before it becomes visible | should | ROLE-003 | | TBD |
| F-015 | FG-05 | Email on booking approval, rejection or change | The user is told the outcome of their request, with the reason when it was rejected | must | ROLE-002 | | TBD |
| F-016 | FG-05 | Account activation email | A newly registered visitor receives the message that activates their account | should | ROLE-001 | | TBD |
| F-017 | FG-06 | Export the room list to Excel | The operator downloads the rooms matching the current search as a spreadsheet | could | ROLE-003 | | TBD |
| F-018 | FG-06 | Booking request statistics | Request volume aggregated by month, by quarter and by room type | could | ROLE-003 | | TBD |
| F-019 | FG-06 | Revenue statistics | Revenue aggregated over a chosen period and by room type | could | ROLE-003 | | TBD |
| F-020 | FG-05 | Month-end revenue summary email | On the last day of each month the operator is sent the revenue summary without asking for it | could | ROLE-003 | | TBD |

## 3. Revision History

| Date | Updated by | Content |
| --- | --- | --- |
| 2026-09-18 | pm-gather-requirements skill | Created; FG-01..FG-06 and F-001..F-020 filled in from the source requirement sheet |
