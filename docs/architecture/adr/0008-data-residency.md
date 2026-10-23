# ADR-0008: Data residency for third parties

**Rule:** personal information about customers, guests, vendors or staff is stored and processed in Australia wherever a reasonable option exists. Any offshore processing must be (1) listed in the privacy policy (APP 8), (2) covered by a contract with the processor, and (3) recorded below.

| Service                        | Data                                    | Location                                       | Status                                                                                     |
| ------------------------------ | --------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Supabase/Neon                  | All core data                           | Sydney                                         | OK                                                                                         |
| Vercel                         | Request processing; functions in `syd1` | Sydney functions, global edge cache            | OK. Do not cache personalised guest data at the edge without a token-scoped key.           |
| Cloudflare R2                  | Media, documents                        | Location hint OC; no AU jurisdiction guarantee | **Disclose** (D-04)                                                                        |
| Stripe                         | Payment data                            | Global (PCI DSS)                               | Disclose; Stripe is the payment processor                                                  |
| Twilio                         | Phone numbers, message content          | US/global                                      | Disclose                                                                                   |
| Resend                         | Email addresses, content                | US/global                                      | Disclose                                                                                   |
| Google Gemini                  | Prompt content                          | Global                                         | **Never send guest PII or health data in prompts.** Send event-level facts only. Disclose. |
| Xero                           | Invoices (business data)                | Global                                         | Disclose                                                                                   |
| Sentry or other error tracking | Scrubbed errors                         | Choose the region at setup                     | Must scrub PII                                                                             |
