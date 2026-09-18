# Role List & Permission Matrix

## 1. User Roles

| ROLE-ID | Role name | Description | Typical user |
| --- | --- | --- | --- |
| ROLE-001 | Visitor | Not signed in. Browses the room list and room detail, searches availability, and registers an account. **Not an account**: no `users` row ever carries this role — it is the absence of authentication, expressed in code by leaving a route unguarded, never by a stored enum value | Someone considering a stay who has no account yet. Deliberately **not** called "Guest": in hotel language a guest is a paying customer who stays — which in this system is always ROLE-002 |
| ROLE-002 | User | A registered, signed-in guest. Everything ROLE-001 can do, plus: create a booking request, view **their own** request history, and cancel a request while it is still unconfirmed | A guest booking a room |
| ROLE-003 | Admin | Hotel operator. Reviews booking requests and approves or rejects them — a rejection must carry a reason — and can see every user's requests | Front-desk staff / hotel manager |

## 2. Permission Matrix (function × role)

> One column per role in §1, one row per function in `function-list.md`.
> Legend: ✅ = allowed / — = not allowed / △ = conditional (state the condition in Notes).

| F-ID | Function | ROLE-001 Visitor | ROLE-002 User | ROLE-003 Admin | Notes |
| --- | --- | --- | --- | --- | --- |
| F-001 | Register an account | ✅ | — | — | Meaningless once signed in |
| F-002 | Sign in / sign out | △ | ✅ | ✅ | A visitor performs the sign-in half; signing out presupposes a session |
| F-003 | View and edit own profile, change password | — | ✅ | ✅ | Own record only |
| F-004 | Manage users | — | — | ✅ | |
| F-005 | View room list and room detail | ✅ | ✅ | ✅ | Public |
| F-006 | Search available rooms by date range and amenity | ✅ | ✅ | △ | Public endpoint, so technically open to an operator too, but it is not part of the operator's workflow — they use F-007 |
| F-007 | Manage rooms (CRUD) | — | — | ✅ | |
| F-008 | Raise a booking request | — | ✅ | — | |
| F-009 | View own booking history | — | ✅ | — | Own requests only; the operator sees every request through F-011 |
| F-010 | Cancel an unconfirmed request | — | △ | — | Own request, and only while it is still undecided |
| F-011 | Approve or reject a booking request | — | — | ✅ | A rejection must carry a reason |
| F-012 | Pay for a request | — | △ | — | Own request only |
| F-013 | Review a room already booked | — | △ | — | Only a room this user actually stayed in |
| F-014 | Moderate reviews | — | — | ✅ | |
| F-015 | Email on booking approval, rejection or change | — | ✅ | — | Recipient, not an action the role invokes |
| F-016 | Account activation email | ✅ | — | — | Recipient |
| F-017 | Export the room list to Excel | — | — | ✅ | |
| F-018 | Booking request statistics | — | — | ✅ | |
| F-019 | Revenue statistics | — | — | ✅ | |
| F-020 | Month-end revenue summary email | — | — | ✅ | Recipient |

## 3. Revision History

| Date | Updated by | Content |
| --- | --- | --- |
| 2026-09-18 | pm-gather-requirements skill | Created; §1 User Roles filled in |
| 2026-09-18 | pm-gather-requirements skill | §2 Permission Matrix filled in for F-001..F-020 |
| 2026-09-18 | pm-gather-requirements skill | ROLE-001 renamed Guest → Visitor to end the clash with "guest" in its hotel sense |
