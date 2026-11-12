# Operations playbook (outline)

How an agency event runs, from enquiry to close. The right-hand column says what the software supports today; everything else is done by hand until the listed ROADMAP item ships.

| Step             | What happens                                                                                                                       | Software today                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1. Enquiry       | Reply within 1 business hour. Qualify on date, guests, budget, ceremony and area.                                                  | www enquiry form → `Lead`; auto-reply and planner alert when Resend is configured; inbox at `/admin` |
| 2. Consultation  | Free, 15–45 minutes. Use the estimate the enquirer carried over from the www estimator, if any, as the agenda.                     | Lead detail in `/admin` (stage `NEW` → `QUALIFIED`, staff notes)                                     |
| 3. Proposal      | Built from packages or the estimate, valid for 14 days, quoting the terms version.                                                 | By hand (ADM-02)                                                                                     |
| 4. Booking       | Deposit paid; the event moves to `BOOKED`; a planner is assigned; the customer is invited to the portal.                           | By hand (ADM-02, PRT-01, PRT-06)                                                                     |
| 5. Planning      | Timeline template per ceremony; vendor bookings confirmed. Invitations sent about 8 weeks out (weddings) or 3 weeks out (parties). | Invitations, RSVP and reminders on `invitation.` (agency events use the `AGENCY` plan)               |
| 6. Final numbers | At T-14 days, apply the RSVP-driven recommendations. Lock the order at T-7.                                                        | Recommendations are computed by the worker; viewing and applying them is planned (ADM-03, PRT-04)    |
| 7. Event pack    | At T-2 days, prepare crew devices and the door; confirm the run-sheet with every vendor.                                           | Door check-in in the browser (`/check-in/[eventId]`); offline packs planned (MOB-03, WIN-05)         |
| 8. Event day     | Bump-in checklist, check-in, run-sheet, incident log, bump-out and inventory return.                                               | QR check-in; the rest by hand (ADM-03, ADM-05, MOB-04)                                               |
| 9. After         | Within 24 hours: thank-you, photos, review request. Vendor payouts released. Damage claims within 5 days.                          | By hand (INV-11, VEN-03, VEN-06)                                                                     |
| 10. Close        | Margin review; retention timers start.                                                                                             | Finance view planned (ADM-06); health-data deletion job planned (PRV-01)                             |

## Incident basics

- A first aid kit and a trained crew member at every event. Emergency numbers on the run-sheet. A weather plan for outdoor events.
- Guests with severe allergies are flagged to the caterer **by table**, not just by count.
- Venue and public-land rules: council hall terms, permits for parks and reserves (for example Kings Park through its managing authority), noise and curfew. Confirm them for every venue at proposal time.
- Software incidents (outage, data breach) follow [`../../infra/INCIDENT_RUNBOOK.md`](../../infra/INCIDENT_RUNBOOK.md).
