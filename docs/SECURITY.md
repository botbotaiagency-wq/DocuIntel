# Security Policy and Guardrails

## Overview
This application implements strict security guardrails to protect Highly Sensitive PII (identity numbers, addresses, signatures, ownership details, beneficiaries).

## Guardrails Implemented
1. **Prompt Injection Protection:** All LLM prompts explicitly state that document content is untrusted data and must not be executed as instructions.
2. **PII Redaction:** Default UI views and exports mask sensitive data (e.g., showing only the last 4 digits of IDs).
3. **Data Minimization & Retention:** Documents are automatically soft-deleted. The application supports a "process-only" mode where raw files are deleted immediately after extraction.
4. **Access Controls:** Strict Role-Based Access Control (RBAC). Only users with explicit permissions can view raw files.
5. **Secure Storage:** Uploads are stored in private object storage buckets. Access is granted via pre-signed URLs with short Time-To-Live (TTL).
6. **No Training on User Data:** AI providers are configured (via Replit AI Integrations) to not use user data for model training.
7. **Secure Logging:** Application logs do not contain document content or PII. Audit logs are kept separate.
8. **Malware & File Type Verification:** Only specific file types (PDF, PNG, JPG) are accepted, and sizes are strictly limited.

## Threat Model
See `THREAT_MODEL.md` for detailed threat analysis and mitigations.