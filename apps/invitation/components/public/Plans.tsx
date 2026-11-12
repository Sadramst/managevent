import type { ReactNode } from "react";
import { fillCopy, type InvitationPublicCopy } from "@managevent/i18n";
import { Card } from "@managevent/ui/brand";
import {
  PLAN_COLUMNS,
  planCopyParams,
  planEntitlements,
  type PlanColumn,
} from "@/lib/public/plans";
import { CheckList } from "./kit";

/**
 * Invitation plans for the home and pricing pages: the same four summary cards and comparison
 * table as www's /invitations page. Every price, limit and tick comes from `INVITATION_PLANS`
 * (`@managevent/payments/plans`) through `lib/public/plans.ts`; the copy only names things.
 */

export interface PlanCardsProps {
  copy: InvitationPublicCopy;
  /** Show each plan's short list of what it adds (pricing page). */
  detailed?: boolean;
  /** A call to action under a plan, e.g. "Start free". */
  action?: (plan: PlanColumn) => ReactNode;
  /** Heading level of the plan names. */
  level?: 2 | 3;
}

export function PlanCards({ copy, detailed, action, level = 3 }: PlanCardsProps) {
  const params = planCopyParams();
  const Heading = `h${level}` as "h2" | "h3";
  return (
    <div className="pub-plans">
      {PLAN_COLUMNS.map((key) => {
        const item = copy.pricing.plans[key];
        return (
          <Card
            key={key}
            as="article"
            variant={key === "premium" ? "accent" : "default"}
            className="pub-plan"
          >
            <Heading className="pub-plan-name">{item.name}</Heading>
            <p className="pub-plan-price" dir="ltr">
              {fillCopy(item.price, params)}
              {key === "premium" ? <small> {copy.shared.inclGst}</small> : null}
            </p>
            <p className="pub-plan-note">{fillCopy(item.note, params)}</p>
            {detailed ? <CheckList items={item.points} /> : null}
            {action ? action(key) : null}
          </Card>
        );
      })}
    </div>
  );
}

export function PlanTable({ copy }: { copy: InvitationPublicCopy }) {
  const params = planCopyParams();
  const plans = planEntitlements();
  const pricing = copy.pricing;
  const yes = copy.shared.included;
  const no = copy.shared.notIncluded;

  const each = (cell: (plan: (typeof plans)[PlanColumn], key: PlanColumn) => string) =>
    PLAN_COLUMNS.map((key) => cell(plans[key], key));
  const tick = (flag: (plan: (typeof plans)[PlanColumn]) => boolean) =>
    each((plan) => (flag(plan) ? yes : no));
  const all = each(() => yes);

  const rows: readonly (readonly [label: string, cells: readonly string[]])[] = [
    [
      pricing.rows.price,
      each((plan, key) =>
        key === "memorial"
          ? pricing.values.complimentary
          : key === "agency"
            ? pricing.values.includedInPackage
            : plan.priceIncGstCents === 0
              ? pricing.plans.free.price
              : fillCopy(pricing.values.oneOff, params),
      ),
    ],
    [
      pricing.rows.guests,
      each((plan) =>
        plan.maxGuests === "unlimited"
          ? copy.shared.unlimited
          : fillCopy(copy.shared.upTo, { guests: plan.maxGuests }),
      ),
    ],
    [
      pricing.rows.templates,
      each((plan, key) =>
        key === "memorial"
          ? pricing.values.templatesMemorial
          : plan.allThemesAndAnimations
            ? pricing.values.templatesAll
            : pricing.values.templatesFree,
      ),
    ],
    [pricing.rows.links, all],
    [pricing.rows.sharing, all],
    [pricing.rows.rsvp, tick((plan) => plan.rsvpAndDietary)],
    [pricing.rows.responses, all],
    [pricing.rows.calendar, all],
    [pricing.rows.well, all],
    [pricing.rows.openingStyles, tick((plan) => plan.allGateStyles)],
    [pricing.rows.customLink, tick((plan) => plan.customEventSlug)],
    [pricing.rows.reminders, tick((plan) => plan.rsvpReminders)],
    [pricing.rows.checkin, tick((plan) => plan.qrPassesAndCheckin)],
    [pricing.rows.branding, tick((plan) => plan.removeBranding)],
    [pricing.rows.bridge, tick((plan) => plan.automaticLogisticsBridge)],
  ];

  return (
    <>
      <p className="notice pub-scroll-hint">{pricing.compareScrollHint}</p>
      <div
        className="table-wrap pub-plan-table"
        tabIndex={0}
        role="region"
        aria-label={pricing.compareCaption}
      >
        <table className="table">
          <caption>{pricing.compareCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{pricing.compareFeatureHeading}</th>
              {PLAN_COLUMNS.map((key) => (
                <th key={key} scope="col">
                  {pricing.plans[key].name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, cells]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {cells.map((cell, index) => {
                  const plan = PLAN_COLUMNS[index];
                  return (
                    <td
                      key={plan}
                      className={cell === no ? "pub-no" : undefined}
                      // The plan name beside each value when the table stacks on a phone.
                      data-label={plan ? pricing.plans[plan].name : undefined}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="notice pub-after">{pricing.footnote}</p>
    </>
  );
}
