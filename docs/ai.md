# AI Features

Venora AI features run in Supabase Edge Functions with database configuration
and usage controls. OpenRouter is the only supported provider and
`qwen/qwen3.7-flash` is the required model. Code inspection and automated tests do
not prove live model/provider behavior.

## Inventory

| Feature                       | Status                     | Input / output                                                                | Provider and fallback                                                                 |
| ----------------------------- | -------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Natural-language venue search | IMPLEMENTED BUT UNVERIFIED | Query/filters to ranked venue/search output                                   | OpenRouter intent parsing plus database-grounded search; deterministic/error fallback |
| Venue recommendations         | IMPLEMENTED BUT UNVERIFIED | User/event preferences to venue suggestions                                   | OpenRouter preference query plus database-grounded results                            |
| Venue-description generation  | IMPLEMENTED BUT UNVERIFIED | Venue attributes/instructions to generated copy                               | Configured model; admin/owner authorization and validation required                   |
| Package comparison            | IMPLEMENTED | Selected package facts to comparison table + optional AI narrative | Venue detail Compare Packages → `ai-package-comparison`; table always; AI best-effort |
| Cost estimation               | IMPLEMENTED BUT UNVERIFIED | Event/budget facts to estimate                                                | Configured model; estimate is non-binding                                             |
| Customer assistant            | IMPLEMENTED BUT UNVERIFIED | Conversation/context to streamed answer; confirmed customer cancellation tool | OpenRouter answers plus deterministic, role/ownership-checked action path             |
| Runtime AI configuration      | IMPLEMENTED BUT UNVERIFIED | Admin settings to model/limits/moderation                                     | `ai_configurations` table and admin permissions                                       |
| Usage logs                    | IMPLEMENTED BUT UNVERIFIED | Token/cost/status metadata                                                    | `ai_usage_logs`; raw prompts/responses are intentionally not stored                   |
| Direct Anthropic provider     | MISSING                    | None                                                                          | No `ANTHROPIC_API_KEY` runtime path                                                   |

Feature enablement, temperatures, token/rate/spend limits, and system
instructions are database-configured. Provider/model selection is locked to
OpenRouter and `qwen/qwen3.7-flash`; alternate provider/model fallbacks and the
legacy direct-embedding path are disabled. `OPENROUTER_API_KEY` stays in
Supabase Edge Function secrets.

## Data and security

Edge Functions authenticate the caller, load feature configuration/limits,
validate inputs, apply basic moderation, call the provider, validate output, and
log usage metadata. Inputs may include event preferences, venue/package facts,
budget, location, and conversational text. Do not send passwords, payment
credentials, verification documents, service-role values, private contact data,
or unrelated customer records.

Treat user and marketplace text as untrusted prompt content. Delimit it from
instructions, minimize retrieved context, enforce authorization before retrieval,
validate structured output, escape rendered output, and never allow model output
to directly authorize mutations. The assistant's booking cancellation tool is
separate from model output: it requires a customer role, booking ownership, a
persisted proposal, an explicit confirmation card, conditional action claiming,
the existing user-JWT `cancel_booking_request` RPC, and append-only audit
evidence. Payments, roles, and policies have no assistant mutation tool. Current
moderation is pattern-based, not a comprehensive provider moderation service.

## Reliability and cost

Provider requests can time out, rate-limit, return invalid data, or exceed cost
budgets. Apply configured per-feature limits, input/output bounds, abort
timeouts, and deterministic error/empty behavior. Retry only safe read/generation
requests with bounded backoff; never duplicate a state-changing action. Monitor
tokens, estimated cost, latency/status, and configuration changes without
recording raw sensitive prompts. General non-AI API rate limiting is a separate
known gap.

Live accuracy, cost, latency, provider moderation, and failure/retry behavior need
credentialed non-production verification before production claims.
