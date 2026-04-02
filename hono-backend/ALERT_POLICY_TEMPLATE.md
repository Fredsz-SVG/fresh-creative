# Alert Policy Template (Copy-Paste Ready)

Gunakan ini sebagai acuan saat membuat alert di dashboard observability.

## 1) Latency Alerts (p95)

- **Alert name**: `api-user-bootstrap-p95-high`
  - Query: p95 latency endpoint `GET /api/user/bootstrap`
  - Condition: `> 500ms` selama `5m`
  - Severity: `SEV-2`
  - Runbook: `hono-backend/PRODUCTION_PERFORMANCE_RUNBOOK.md`

- **Alert name**: `api-user-me-p95-high`
  - Query: p95 latency endpoint `GET /api/user/me`
  - Condition: `> 400ms` selama `5m`
  - Severity: `SEV-2`
  - Runbook: `hono-backend/PRODUCTION_PERFORMANCE_RUNBOOK.md`

- **Alert name**: `api-albums-p95-high`
  - Query: p95 latency endpoint `GET /api/albums`
  - Condition: `> 900ms` selama `5m`
  - Severity: `SEV-2`
  - Runbook: `hono-backend/PRODUCTION_PERFORMANCE_RUNBOOK.md`

## 2) Error Rate Alerts

- **Alert name**: `api-global-error-rate-high`
  - Query: `(5xx + timeout) / total requests`
  - Condition: `> 2%` selama `5m`
  - Severity: `SEV-2`
  - Escalation: on-call engineer

- **Alert name**: `api-global-error-rate-critical`
  - Query: `(5xx + timeout) / total requests`
  - Condition: `> 5%` selama `5m`
  - Severity: `SEV-1`
  - Escalation: on-call + incident channel

## 3) Auth Anomaly Alerts

- **Alert name**: `api-auth-401-403-spike`
  - Query: rate status code `401 OR 403` pada endpoint auth/user
  - Condition: `> 2x baseline` selama `10m`
  - Severity: `SEV-2`
  - Note: indikasi cookie/JWT mismatch atau env issue

## 4) Cache Health Alerts (opsional, sangat disarankan)

- **Alert name**: `api-cache-hit-drop-user-routes`
  - Query: rasio `X-Cache=HIT` untuk `/api/user/me|/bootstrap|/notifications`
  - Condition: `< 30%` selama `10m` saat traffic normal
  - Severity: `SEV-3`
  - Note: bisa jadi invalidasi terlalu agresif atau TTL terlalu pendek

## Notification Routing (template)

- `SEV-1` -> Pager + incident Slack/Discord + call tree
- `SEV-2` -> On-call channel + issue auto-created
- `SEV-3` -> Engineering ops channel (non-paging)
