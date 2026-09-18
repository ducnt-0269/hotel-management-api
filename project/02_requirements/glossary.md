# Glossary

> Collected retroactively: terms noted as they came up during the Block O–C interviews, then confirmed
> together. General IT vocabulary (sign-in, JWT, CSV) is deliberately left out — only domain and
> project-specific words are recorded here.

## 1. Terms

| Term | Reading / abbreviation | Definition | Notes |
| --- | --- | --- | --- |
| Booking request | request | A user's proposal to take a room over a date range. It is **not** a held reservation: it becomes one only once an administrator approves it | The source sheet calls this "request booking" |
| Booking | | A request that has been approved — a real hold that occupies the room for its date range | |
| Room | | One physical room with its own room number. **Not** a room category: this system books a named room, never a room type | Settles a modelling question that would otherwise reshape the booking table |
| Amenity | | A room characteristic used to narrow a search: air conditioning, bed type, view | |
| Availability | | Whether a room is free **over a stated date range**. Never a standing property of a room — "available" is meaningless without dates | |
| Check-in / Check-out | | The arrival and departure dates on a request. The span between them is the room's occupied period | |
| Overlap | | Two date ranges that intersect on the same room — the condition the system must refuse (NFR-005) | The core correctness rule of the project |
| Approve | | The administrator's decision that turns a request into a booking | |
| Reject | | The administrator's decision to refuse a request; it must carry a reason | |
| Cancel | | The **user's own** withdrawal of their request, possible only while no decision has been made | Distinct from Reject: different actor, different precondition |
| Visitor | ROLE-001 | Someone using the system without signing in. Chosen over "Guest" precisely to avoid the collision below | |
| Guest | | **Hotel sense only**: a paying customer who stays. In this system a guest is always ROLE-002 User, never ROLE-001 | The source sheet writes "Guess" (a typo for Guest) to mean an unauthenticated visitor — the opposite of the hotel meaning. Role names here avoid the word entirely so the two senses can never be confused |
| Mock Project | MP | The final exercise of the NestJS training track: a self-chosen subject built end to end and reviewed by a mentor | |

## 2. Revision History

| Date | Updated by | Content |
| --- | --- | --- |
| 2026-09-18 | pm-gather-requirements skill | Created; 13 domain terms confirmed, including the Visitor / Guest naming clash |
