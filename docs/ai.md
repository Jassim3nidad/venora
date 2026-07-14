# AI Features

Venora AI features run in Supabase Edge Functions with database configuration
and usage controls. Supported provider identifiers are `openrouter` and
`openai`; direct Anthropic integration is missing. Code inspection and automated
tests do not prove live model/provider behavior.

## Inventory

| Feature                       | Status                     | Input / output                                  | Provider and fallback                                                                  |
| ----------------------------- | -------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Natural-language venue search | IMPLEMENTED BUT UNVERIFIED | Query/filters to ranked venue/search output     | OpenAI embeddings when configured plus database search; deterministic/error fallback   |
| Venue recommendations         | IMPLEMENTED BUT UNVERIFIED | User/event preferences to venue suggestions     | Configured OpenRouter/OpenAI model; safe empty/error fallback                          |
| Venue-description generation  | IMPLEMENTED BUT UNVERIFIED | Venue attributes/instructions to generated copy | Configured model; admin/owner authorization and validation required                    |
| Package comparison            | IMPLEMENTED BUT UNVERIFIED | Selected package facts to comparison            | Configured model with persisted comparison support                                     |
| Cost estimation               | IMPLEMENTED BUT UNVERIFIED | Event/budget facts to estimate                  | Configured model; estimate is non-binding                                              |
| Customer assistant            | PARTIAL                    | Conversation/context to streamed answer         | Current streaming path is OpenRouter-oriented; failure if key/provider path mismatches |
| Runtime AI configuration      | IMPLEMENTED BUT UNVERIFIED | Admin settings to model/limits/moderation       | `ai_configurations` table and admin permissions                                        |
| Usage logs                    | IMPLEMENTED BUT UNVERIFIED | Token/cost/status metadata                      | `ai_usage_logs`; raw prompts/responses are intentionally not stored                    |
| Direct Anthropic provider     | MISSING                    | None                                            | No `ANTHROPIC_API_KEY` runtime path                                                    |

Provider/model selections, temperatures, token/rate/spend limits, and feature
enablement are database-configured. Old per-feature OpenAI model environment
variables are deprecated. `OPENROUTER_API_KEY` is required for the currently
OpenRouter-specific assistant/generation paths; `OPENAI_API_KEY` is optional for
configured OpenAI and embeddings.

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
to directly authorize/mutate payments, bookings, roles, or policies. Current
moderation is pattern-based, not a comprehensive provider moderation service.

## Reliability and cost

Provider requests can time out, rate-limit, return invalid data, or exceed cost
budgets. Apply configured per-feature limits, input/output bounds, abort
timeouts, and deterministic error/empty behavior. Retry only safe read/generation
requests with bounded backoff; never duplicate a state-changing action. Monitor
tokens, estimated cost, latency/status, and configuration changes without
recording raw sensitive prompts. General non-AI API rate limiting is a separate
known gap.

Live accuracy, cost, latency, provider moderation, and failure fallback need
credentialed non-production verification before production claims.
