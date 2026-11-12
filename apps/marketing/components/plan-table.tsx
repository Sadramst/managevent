import { fillCopy, getSitePages } from "@managevent/i18n";
import type { EnabledLocale } from "@managevent/types";
import { Card } from "@managevent/ui/brand";
import { planCopyParams } from "../lib/plans";

type PlanKey = "free" | "premium" | "memorial" | "agency";
const PLAN_ORDER: readonly PlanKey[] = ["free", "premium", "memorial", "agency"];

/**
 * Invitation plans: four summary cards and, when `detailed`, a feature comparison table.
 * The Premium price and the Free guest limit come from `packages/payments` plan config
 * (see `lib/plans.ts`); nothing here hard-codes a price.
 */
export function PlanTable({ locale, detailed }: { locale: EnabledLocale; detailed?: boolean }) {
  const site = getSitePages(locale);
  const copy = site.invitations;
  const shared = site.shared;
  const plan = planCopyParams();
  const fill = (text: string) => fillCopy(text, plan);
  const values = copy.planValues;

  const yes = shared.included;
  const no = shared.notIncluded;
  const all = [yes, yes, yes, yes] as const;
  const rows: readonly (readonly [label: string, cells: readonly string[]])[] = [
    [
      copy.planRows.price,
      [values.free, fill(values.oneOff), values.complimentary, values.includedInPackage],
    ],
    [
      copy.planRows.guests,
      [fill(values.guestsUpTo), values.unlimited, values.unlimited, values.unlimited],
    ],
    [copy.planRows.studio, all],
    [copy.planRows.links, all],
    [copy.planRows.sharing, all],
    [copy.planRows.rsvp, all],
    [copy.planRows.dashboard, all],
    [copy.planRows.calendar, all],
    [copy.planRows.checkin, [no, yes, yes, yes]],
    [copy.planRows.bridge, [no, no, no, yes]],
  ];

  return (
    <>
      <div className="sp-plans">
        {PLAN_ORDER.map((key) => {
          const item = copy.plans[key];
          return (
            <Card
              key={key}
              as="article"
              variant={key === "premium" ? "accent" : "default"}
              className="sp-plan"
            >
              <h3 className="sp-plan-name">{item.name}</h3>
              <p className="sp-plan-price" dir="ltr">
                {fill(item.price)}
                {key === "premium" ? <small> {shared.inclGst}</small> : null}
              </p>
              <p className="sp-plan-note">{fill(item.note)}</p>
            </Card>
          );
        })}
      </div>

      {detailed ? (
        <>
          <p className="notice sp-scroll-hint">{copy.plansScrollHint}</p>
          <div
            className="table-wrap sp-plan-table"
            tabIndex={0}
            role="region"
            aria-label={copy.plansCaption}
          >
            <table className="table">
              <caption>{copy.plansCaption}</caption>
              <thead>
                <tr>
                  <th scope="col">{copy.plansFeatureHeading}</th>
                  {PLAN_ORDER.map((key) => (
                    <th key={key} scope="col">
                      {copy.plans[key].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, cells]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {cells.map((cell, index) => (
                      <td key={PLAN_ORDER[index]} className={cell === no ? "sp-no" : undefined}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="notice sp-after">{copy.plansFootnote}</p>
        </>
      ) : null}
    </>
  );
}
