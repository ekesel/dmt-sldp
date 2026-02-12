# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision
A multi-tenant SaaS platform that unifies Quality Enforcement (DMT) and Productivity Measurement (SLDP), providing real-time compliance monitoring and AI-powered insights across heterogeneous project management and code registry tools.

## Goals
1. **Automated Quality Enforcement**: Implement "Done Means Tested" logic via automated data validation across Jira, ClickUp, and Azure Boards.
2. **Unified Analytics Layer**: Normalize and aggregate data from multiple sources (Jira/ClickUp/Azure Boards + Azure DevOps/GitHub) into a single, cohesive visibility layer.
3. **Predictive Intelligence**: Leverage AI to provide team optimization suggestions and statistical forecasting for delivery timelines.
4. **Multi-tenant Scalability**: Build a robust, schema-isolated architecture supporting rapid onboarding of new companies and projects without code changes.

## Non-Goals (Out of Scope)
- **Workflow Blocking**: The system will monitor and flag compliance but will not actively block transitions in the source PM tools.
- **Direct IDE Integration**: Quality gates are enforced at the registry/PR level, not via local IDE plugins (initial version).
- **Custom BI Tooling**: While it provides analytics, it is not a general-purpose BI tool; it focuses specifically on DMT/SLDP metrics.

## Users
- **Platform Admin**: Manages tenants, global system health, and high-level data retention.
- **Company Users (Leaders/Developers)**: View dashboards, compliance flags, individual/team metrics, and AI insights.

## Constraints
- **Technical**: Must use Django 5.x (Backend), Next.js 14 (Frontend), and PostgreSQL 15+ (Multi-tenant).
- **Integration**: Must support REST/GraphQL APIs of Jira, ClickUp, Azure Boards, and GitHub/Azure DevOps Git.
- **Security**: Multi-tenant data isolation at the schema level is strictly required.

## Success Criteria
- [ ] Successful data extraction and normalization from at least three different source types.
- [ ] Real-time WebSocket updates for dashboard metrics and ETL progress.
- [ ] Accurate calculation of DMT compliance rates and developer-level productivity metrics.
- [ ] Functional AI-generated insights based on historical sprint data.
