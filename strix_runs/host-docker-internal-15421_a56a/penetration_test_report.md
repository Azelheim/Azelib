# Security Penetration Test Report

**Generated:** 2026-08-26 07:43:35 UTC

# Executive Summary

# Executive Summary

A remote security assessment of the self-hosted Supabase platform exposed at `http://host.docker.internal:15421` identified **two critical** and **one medium** confirmed vulnerabilities that together permit **complete, unauthenticated compromise of the platform's database, user accounts, and access-control model**.

**Overall risk posture: Critical.**

**Key findings**
- **Unauthenticated arbitrary SQL execution over the database** — the Supabase `postgres-meta` management service is exposed on the public gateway under `/pg/*` with no authentication. `POST /pg/query` executes arbitrary SQL as the `postgres` role, giving full read/write/delete over every table, disclosure of all account email addresses and bcrypt password hashes, and complete Row Level Security (RLS) bypass. (Critical, CVSS 9.8)
- **Predictable JWT signing secret enables full account takeover** — the deployment uses the publicly documented default Supabase `JWT_SECRET`. An attacker can forge a valid `service_role` JWT with no credentials, enumerate every registered user, reset any account's password, and log in as that user. The same token is honored by PostgREST as `service_role`, bypassing RLS. (Critical, CVSS 9.8)
- **Refresh token rotation does not invalidate prior tokens** — a rotated/stolen refresh token remains valid and usable indefinitely (no reuse detection), keeping a compromised session alive for its full lifetime. (Medium, CVSS 6.5)

**Business impact**
- **Total data exposure**: all user PII and password hashes, plus all application (tenant) data, are readable without authentication.
- **Full account takeover**: any administrator or user account can be compromised.
- **Data integrity and availability**: an attacker can modify or destroy any data and create/drop tables and roles.
- **Isolation collapse**: the tenant-isolation (RLS) design is rendered completely ineffective by both critical findings.

The PostgREST REST API layer itself is correctly gated (anonymous table reads return HTTP 401 `42501 anon-permission-denied`; there is no reachable SQL injection and no exploitable cross-tenant IDOR/BOLA via the REST API). The exposed management routes and the predictable signing key are the systemic weaknesses that undermine the entire platform.

**Overarching remediation theme:** Remove the unauthenticated `postgres-meta` (`/pg/*`) routes from the public gateway and rotate the JWT signing secret to a high-entropy value. These two actions neutralize the total-compromise paths; the refresh-token hardening is a defense-in-depth follow-up.

# Methodology

# Methodology

**Engagement type:** Gray-box external security assessment (no source code provided; live target tested over the network).

**Framework:** Conducted per the OWASP Web Security Testing Guide (WSTG) and PTES, scoped to the in-scope origin `http://host.docker.internal:15421`.

**Approach:** Customary reconnaissance-to-validation workflow carried out by specialized testing tracks:

1. **Reconnaissance & attack-surface mapping** — enumerated all Supabase service sub-origins (REST, Auth/GoTrue, Storage, postgres-meta, Edge Functions, Realtime, GraphQL), the PostgREST OpenAPI schema, all database tables and RPC functions, RLS policy definitions, roles, and the public authentication configuration.
2. **Unauthenticated access testing** — probed the postgres-meta (`/pg/*`) management API, the REST layer, auth settings, and Storage for unauthenticated reachability, schema disclosure, and arbitrary query execution.
3. **Multi-tenant isolation / BOLA / IDOR testing** — created two distinct users via the open signup flow and tested horizontal isolation across all 11 tables, membership escalation via `tenant_member`, RPC (`get_user_tenants`) abuse, and the security-definer path.
4. **SQL injection testing** — performed error-, boolean-, and time-based injection testing against PostgREST `select`/`order`/`filter`/`columns`/`on_conflict` parameters and the RPC endpoint across every exposed table, using payload sprays and timing discriminators.
5. **Authentication / mass-assignment / RPC / business-logic testing** — exercised GoTrue signup, token, refresh, and admin endpoints; tested signup-claim escalation; tested authenticated POST/PATCH on all tables; probed RPC and Storage.

Each finding was independently validated with a working proof of concept before reporting, including verifying that demonstrated impacts (not theoretical reachability) drive the CVSS scoring. All test data was cleaned up after validation. No application source code was supplied, so white-box static analysis was not performed; all results are dynamic and PoC-backed.

# Technical Analysis

# Technical Analysis

**Severity model:** findings are rated by demonstrated exploitability and real impact (CVSS 3.1). Two independent Critical root causes each yield total platform compromise; one Medium session-management weakness was also confirmed.

**Confirmed findings (see individual vulnerability reports for full detail):**

1. **Unauthenticated arbitrary SQL execution via exposed postgres-meta API** (Critical, CVSS 9.8, CWE-306) — `POST /pg/query` returns `current_user=postgres` with `can_bypass_rls` and no authentication. Proof: read `auth.users` emails + bcrypt password hashes; insert→read→delete a full foreign-key data chain; create and drop tables via `POST /pg/tables`. Root cause: the `postgres-meta` management service routed under `/pg/*` is exposed on the public Kong gateway with no auth. The intended access control is intact on PostgREST (anonymous reads return 401 `42501 anon-permission-denied`), so this channel completely nullifies the RLS/access-control design.

2. **Predictable JWT signing secret enables forged `service_role` token and full account takeover** (Critical, CVSS 9.8, CWE-798) — the deployment uses the publicly documented default Supabase `JWT_SECRET` `super-secret-jwt-token-with-at-least-32-characters-long`. A forged HS256 JWT with `role=service_role` is accepted by GoTrue (`GET /auth/v1/admin/users` enumerates all 15 users; `PUT /auth/v1/admin/users/{id}` resets any password) and by PostgREST (role mapped to `service_role`). Full account takeover demonstrated end-to-end. Signature acceptance was discriminated (correct secret → passes JWT verification, fails only at a later UUID cast; wrong secret/`alg=none` → rejected at verification).

3. **Refresh token rotation does not invalidate prior tokens** (Medium, CVSS 6.5, CWE-613) — GoTrue rotates refresh tokens on use but does not invalidate the superseded token or detect reuse. Replaying an already-rotated token returns HTTP 200 with a fresh access token repeatedly; only global logout invalidates it.

**Clean negatives (tested, not exploitable, not filed):**
- **SQL injection** — no working vector in any PostgREST parameter. All 11 public tables grant non-data privileges only (`MAINTAIN/REFERENCES/TRIGGER/TRUNCATE`) to anon/authenticated/service_role, so requests fail with 403/401 before SQL is built; the single RPC (`get_user_tenants`) takes no arguments; PostgREST 16.1 parser rejects injected syntax with no timing/error discriminator.
- **Multi-tenant isolation bypass (IDOR/BOLA) via REST** — no cross-tenant access. Authenticated reads of all tables return 403 `42501`; the RLS policies are correctly tenant-scoped but never activate because no role holds DML grants. `get_user_tenants` returns `[]` for all users and cannot be abused.
- **Mass assignment / RPC abuse** — no table is writable via PostgREST for any tested role; no membership escalation possible.
- **Authentication claim escalation** — GoTrue strips attacker-controlled metadata and forces `role=authenticated`; no privilege escalation via signup.
- **Storage** — fully JWT-gated; no anon/authenticated object or bucket access.
- **Edge Functions** — none are exposed on this origin (all `/functions/v1/*` returned 404).

**Systemic themes:** The platform's security collapses at the boundary rather than at the application logic. The two Critical findings share the theme of a default/over-exposed management surface: an unauthenticated schema/query-management route (`/pg/*`) and a default-credential signing key. The RLS/tenant-isolation design is sound but is rendered moot by these weaknesses. The REST data plane is hardened (missing DML grants) and itself limits exposure, but the `postgres-meta` and JWT-forgery channels bypass it entirely.

**Attack chaining:** The two Critical findings are independent root causes, each independently achieving total platform compromise (full database control; full account takeover + RLS bypass). Chaining them yields no additional demonstrated impact beyond what each already provides, so they are reported separately. The Medium refresh-token finding is a distinct session-persistence weakness that persists in the absence (or repair) of the Critical issues. No further chain escalation was identified.

# Recommendations

# Recommendations

**Immediate (remediate now — both neutralize total-compromise paths):**
1. **Remove the unauthenticated `postgres-meta` (`/pg/*`) routes from the public gateway.** Configure Kong to deny all methods on `/pg/*` (404/403) from the internet, exposing this management surface only to the internal/trusted management network, and require an approved token/role at the postgres-meta service itself. Re-validate that `/pg/query` and `/pg/tables` no longer respond anonymously.
2. **Rotate the JWT signing secret.** Replace the default `JWT_SECRET` with a high-entropy value (at least 64 bytes) and rotate it consistently across GoTrue, PostgREST, Kong, Storage, and Realtime. Regenerate the `anon`/`service_role` API keys, restart the affected services, and move secrets to a secrets manager (never a docker-compose template or version control).
3. **Post-compromise audit.** Because arbitrary `service_role` SQL execution and token forgery have been demonstrated, audit `auth.users` for accounts whose passwords or metadata were altered without authorization, review the database for unauthorized objects/roles, and rotate everything that shared the old JWT secret.

**Short-term (hardening):**
4. **Enable refresh-token reuse detection and a reuse grace period in GoTrue** so that a previously rotated refresh token is rejected and the affected session is invalidated on reuse; revoke outstanding refresh tokens for a session when a new one is issued (addresses the confirmed Medium finding).
5. **Deny/redact schema disclosure surface**: remove or restrict the unauthenticated PostgREST OpenAPI schema endpoint if it is not required for the public app, even though the REST layer is otherwise gated.

**Medium-term (defense in depth):**
6. Keep the REST data plane's least-privilege model, and when DML grants are eventually added to the `authenticated` role, re-test the RLS policies — several tables currently carry `public read true`-style policies that would become live and must be re-scoped per-tenant.
7. Establish monitoring/alerting for unexpected requests to `/pg/*`, `/auth/v1/admin/*`, and anomalous refresh-token usage to detect early signs of the above attack patterns.

**Retest & validation:** After applying (1) and (2), re-verify that `/pg/query`/`/pg/tables` return 403/404 anonymously, that a forged default-secret JWT is rejected (`PGRST301`), and that replaying a rotated refresh token no longer yields a valid access token. Confirm the specific remediation in each of the three vulnerability reports is effective before closing the findings.

