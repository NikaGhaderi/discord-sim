# identity

Owns authentication and account lifecycle from the frontend's perspective: login,
registration, session/token handling, and password reset flows.

Consumes `src/infrastructure` for API/token storage. Must not be imported by
`src/shared`. Cross-module usage (e.g. "current user") should go through a
shared context exposed under `src/infrastructure` rather than reaching into
this module directly.
