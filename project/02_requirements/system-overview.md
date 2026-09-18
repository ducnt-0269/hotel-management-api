# System Overview

> The service/product view: what is being built, why, and what it is meant to achieve.
> KPIs and success criteria are **out of scope** here — they live in `project/01_management/overview.md`
> §2 and are owned by `pm-plan-project` (PLAN).

## 1. Service Overview

A hotel management system delivered as a **backend REST API only** — there is no frontend in scope.
Visitors browse rooms and search for availability without signing in. Registered users create booking
requests, review their own request history, and cancel a request while it is still unconfirmed.
Administrators review those requests and approve or reject them, with a reason attached on rejection.

This is the **Mock Project of the NestJS training track**: the deliverable exists to demonstrate the
engineering skills on the training checklist and to be reviewed by a mentor, not to serve a live hotel.

| Item | Value |
| --- | --- |
| Target platform | Web API (REST / JSON), backend only — no UI is built |
| Primary users | Visitor (unauthenticated) / User (registered) / Admin (hotel operator) |
| Where the data is mastered | All data is entered and owned by this system; no external system integration |

## 2. Background & Problems

> **Note:** the business context below is a *hypothesis* constructed for the training Mock Project.
> It does not come from a real client and must not be read as confirmed customer information.

| # | Current problem | Impact |
| --- | --- | --- |
| 1 | Booking requests arrive by phone and are written into a paper ledger; two staff members can take two requests for the same room over the same dates | The guest arrives to find no room available — apology, re-accommodation or refund |
| 2 | Guests cannot check for themselves which rooms are free on which dates and must call the front desk | The front desk is overloaded at peak hours; guests calling out of hours reach nobody and book elsewhere |
| 3 | Requests are confirmed manually and the guest has no way to see the state of their own request | Guests call back repeatedly; the switchboard spends its time answering the same question |
| 4 | When a request is rejected the reason is only given verbally and is recorded nowhere | The guest does not understand why; later nobody can trace who rejected it or on what grounds |
| 5 | Cancelling a request requires a phone call during office hours | Guests cancel late or not at all; the room is held for nothing and the sale is lost |

## 3. Objectives & Value Delivered

| # | Objective | Value delivered | Related problem # |
| --- | --- | --- | --- |
| 1 | Let guests search room availability by date range and by amenity | Self-service around the clock; far fewer availability calls to the front desk | 2 |
| 2 | Reject overlapping bookings at the moment the request is recorded | No guest arrives to find their room already taken | 1 |
| 3 | Let users see their own booking history and its current state | Guests check for themselves instead of calling | 3 |
| 4 | Require a reason on rejection and notify the user by email automatically | The guest learns the outcome and the reason at once; the decision leaves a trace | 3, 4 |
| 5 | Let users cancel a request while it is still unconfirmed | The room is released early and can be sold again | 5 |

## 4. Revision History

| Date | Updated by | Content |
| --- | --- | --- |
| 2026-09-18 | pm-gather-requirements skill | Created; §1 Service Overview filled in |
| 2026-09-18 | pm-gather-requirements skill | §2 Background & Problems and §3 Objectives filled in (business context is a stated hypothesis) |
| 2026-09-18 | pm-gather-requirements skill | ROLE-001 renamed Guest → Visitor; "guest" now only ever means a hotel customer |
