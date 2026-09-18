# Non-Functional Requirements

> Categories that do not apply to this project are marked **out of scope** with a reason rather than being
> filled in mechanically. Numeric targets are only written in once the user has approved them.
> Compatibility targets recorded here are authoritative for `pm-plan-test` (TEST) §3.1.
>
> Scoping note: this is a training Mock Project that runs locally in Docker and is never deployed to
> production. The requirements kept below are the ones the delivery is actually judged on; the rest are
> listed in §2 with the reason they do not apply.

## 1. Requirements

| NFR-ID | Category | Requirement | Target value | Priority | How it is verified | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| NFR-001 | Performance | Searching available rooms over a date range stays responsive on a realistic dataset | **Not fixed at requirements time.** A baseline is measured against the seeded dataset (~200 rooms, ~5,000 bookings) once the seeder exists, recorded here, and a target agreed from it | should | Measure and record a baseline; later changes must not regress it | No real traffic exists to derive a figure from, and an invented number would be a target nobody could defend. Left open per the NFR catalog's own guidance for thin reasoning |
| NFR-002 | Performance | List endpoints issue no N+1 queries | Query count does not grow with the number of rows in a page | must | Query-count assertion in tests | |
| NFR-003 | Security | Passwords are stored only as hashes and are never returned by any endpoint | bcrypt; no password field in any response body | must | Unit test + e2e | |
| NFR-004 | Security | Every endpoint outside the public room catalogue requires a valid token; admin endpoints reject a non-admin token | 401 when the token is missing, 403 when the role is wrong | must | e2e per role | |
| NFR-005 | Data integrity | The database itself rejects two live bookings that overlap on the same room and date range — application code alone is not sufficient | Enforced by a database constraint, not only by a service-layer check | must | Concurrent double-insert test | The single most important guarantee in the system; see system-overview §2 problem 1 |
| NFR-006 | Maintainability | Every migration has a working reverse path | `up → down → up` completes cleanly | should | Run in CI | |
| NFR-007 | Maintainability | Unit and e2e tests run automatically on every push and must pass before merge | The whole suite green | must | GitHub Actions | |

## 2. Out of Scope

| Category | Reason |
| --- | --- |
| Availability | Never deployed to production; runs locally in Docker, so there is no uptime to commit to |
| Extensibility | A training project with a closed scope and no growth roadmap |
| Laws & Regulations | No real personal data and no real users |
| Data Management | No production data to back up or to set a retention period for |
| Compatibility | Excluded by the NFR catalog itself — it belongs to the test planning phase, not to requirements |

## 3. Revision History

| Date | Updated by | Content |
| --- | --- | --- |
| 2026-09-18 | pm-gather-requirements skill | Created; NFR-001..NFR-007 approved, five categories recorded as out of scope |
| 2026-09-18 | pm-gather-requirements skill | NFR-001 target left open — a measured baseline replaces the invented p95 figure |
