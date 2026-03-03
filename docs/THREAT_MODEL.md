# Threat Model

## Actors
- **Uploader:** User who uploads documents.
- **Reviewer:** User who reviews extracted data and original documents.
- **Admin:** User who configures schemas and policies.
- **System / AI Agent:** Processes documents.

## Assets
- **Original Documents:** High value. May contain PII (NRIC, names, addresses).
- **Extracted Data (JSON):** High value. Contains structured PII.
- **Audit Logs:** Medium value. Used for compliance.

## Threats and Mitigations
| Threat | Description | Mitigation |
|---|---|---|
| Unauthorized Access | User views documents belonging to another org or user. | Strict RBAC in API routes; Organization isolation checks on queries. |
| Prompt Injection | Malicious document text alters AI behavior. | LLM prompts treat document text as untrusted data. Validation engine checks schema structure independent of LLM output. |
| Data Leakage via Logs | PII is accidentally printed to application logs. | Logging filters implemented. Do not log full extracted JSON payloads in production. |
| Insecure Storage | Documents are accessible publicly via guessable URLs. | Object storage bucket is private. Access is mediated via pre-signed URLs with short TTLs. |
| Data Retention Violation | Documents kept longer than policy. | Soft deletes implemented. Background job (or synchronous check) purges documents past retention date. |