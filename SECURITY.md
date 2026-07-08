# Security And Prompt-Safety Notes

This prototype is built with synthetic data only and does not call an external LLM. The current "AI assist" layer is deterministic text generation from loaded CSV fields. That keeps the demo safe while still showing how AI-style summaries, themes, and risk narratives could support a returns control process.

## Current Controls

- Uploaded CSV content is treated as untrusted operational data.
- Notes, delay reasons, status text, and item descriptions are scanned for prompt-injection and jailbreak-style patterns.
- Flagged rows appear in the dashboard prompt-security panel.
- Flagged issue summaries are marked with limited confidence.
- AI-assist summaries disclose the source fields used.
- No uploaded text is treated as a system instruction or developer instruction.
- No automated outbound messages, source-system updates, return closures, or financial decisions are performed.
- Uploaded files replace only the in-memory browser session dataset.

## Future LLM Integration Rules

If this concept is connected to a real LLM, the integration should follow these rules before any production pilot:

- Keep system and developer instructions outside user-editable data.
- Pass return notes and delay reasons as quoted evidence, not instructions.
- Never include secrets, credentials, API keys, hidden prompts, or privileged policy text in model context.
- Redact or minimize customer, partner, serial-number, patient, financial, and commercially sensitive data.
- Require every generated summary to cite return IDs and source fields.
- Use allowlisted tools only; never let uploaded text choose tools, destinations, commands, recipients, or API actions.
- Route escalations, email, Teams messages, writebacks, and status changes through human approval.
- Log model inputs, outputs, source row IDs, reviewer decisions, and final sent messages where policy allows.
- Test with malicious spreadsheet rows before expanding scope.

## Example Threats Covered By The Prototype

- "Ignore previous instructions" style text inside return notes.
- Requests to reveal a system prompt, hidden prompt, token, or API key.
- Jailbreak phrases such as developer mode or bypass safety.
- Uploaded text trying to force raw JSON, base64, tool calls, shell commands, or hidden instructions.

## Remaining Enterprise Requirements

A real Philips-style deployment would still need SSO, role-based access control, retention rules, audit logging, approved data classifications, incident handling, vendor review, and security sign-off before using real operational data.
