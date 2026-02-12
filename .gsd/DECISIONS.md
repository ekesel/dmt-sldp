# DECISIONS.md (ADR Log)

## ADR-001: Multi-tenant Architecture
**Status**: ACCEPTED
**Context**: Required high isolation for corporate data.
**Decision**: Use PostgreSQL schema-per-tenant strategy.
**Consequences**: Requires schema switching logic in Django and dynamic migration management.
