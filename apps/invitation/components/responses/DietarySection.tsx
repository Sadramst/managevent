import { TriangleAlert } from "lucide-react";
import type { InvitationStudioGuestsCopy } from "@managevent/i18n";
import type { DietaryMatrix } from "@managevent/validators";
import { Badge, Notice } from "@/components/ui";
import { fillCount } from "@/lib/guest-list/fill";
import { tableLabelText } from "@/lib/guest-list/view";

type DietaryCounts = DietaryMatrix["counts"];
type DietaryTag = keyof DietaryCounts;

/** Allergies first (they matter most to a kitchen), then the dietary choices. */
const TAG_ORDER: readonly DietaryTag[] = [
  "NUT_ALLERGY",
  "SHELLFISH_ALLERGY",
  "OTHER_ALLERGY",
  "GLUTEN_FREE",
  "DAIRY_FREE",
  "VEGETARIAN",
  "VEGAN",
  "HALAL",
  "KOSHER",
];

function CountPills({
  counts,
  labels,
  label,
}: {
  counts: DietaryCounts;
  labels: InvitationStudioGuestsCopy["common"]["dietary"];
  label?: string;
}) {
  const present = TAG_ORDER.filter((tag) => counts[tag] > 0);
  if (present.length === 0) return null;
  return (
    <ul className="pills sb-diet-counts" aria-label={label}>
      {present.map((tag) => (
        <li key={tag} className="pill">
          {labels[tag]} <strong className="num">{counts[tag]}</strong>
        </li>
      ))}
    </ul>
  );
}

/**
 * The dietary and access matrix: totals, a severe-allergy flag, one row per guest who shared a
 * need, and totals by table. Rendered only when the API allowed `health:read`; a 403 hides the
 * whole section (the page passes nothing).
 *
 * The table keeps its semantics with explicit roles, because under 680px each row is laid out
 * as a stacked card (`.sb-stack-table`).
 */
export function DietarySection({
  matrix,
  copy,
  common,
}: {
  matrix: DietaryMatrix;
  copy: InvitationStudioGuestsCopy["responses"]["dietary"];
  common: InvitationStudioGuestsCopy["common"];
}) {
  const severe = matrix.rows.filter((row) => row.allergySeverity === "SEVERE_ANAPHYLAXIS").length;
  const tables = matrix.byTable.filter(
    (table) => table.severe > 0 || TAG_ORDER.some((tag) => table.counts[tag] > 0),
  );

  if (matrix.rows.length === 0) {
    return <p className="muted">{copy.none}</p>;
  }

  return (
    <>
      {severe > 0 ? (
        <Notice tone="danger" className="sb-notice">
          <p className="sb-flag">
            <TriangleAlert className="icon" aria-hidden="true" />
            <strong>{fillCount(severe, copy.severeOne, copy.severe)}</strong>
          </p>
        </Notice>
      ) : null}
      <CountPills counts={matrix.counts} labels={common.dietary} label={copy.countsLabel} />

      <div className="table-wrap sb-stack-wrap" tabIndex={0}>
        <table className="table sb-stack-table" role="table">
          <caption>{copy.caption}</caption>
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">
                {copy.guest}
              </th>
              <th scope="col" role="columnheader">
                {copy.household}
              </th>
              <th scope="col" role="columnheader">
                {copy.table}
              </th>
              <th scope="col" role="columnheader">
                {copy.needs}
              </th>
              <th scope="col" role="columnheader">
                {copy.allergy}
              </th>
              <th scope="col" role="columnheader">
                {copy.access}
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {matrix.rows.map((row) => (
              <tr key={row.guestId} role="row">
                <th scope="row" role="rowheader">
                  <span className="sb-diet-guest">
                    {row.guestName}
                    {row.isChild ? <span className="pill">{common.child}</span> : null}
                  </span>
                </th>
                <td role="cell" data-label={copy.household}>
                  {row.partyDisplayName}
                </td>
                <td role="cell" data-label={copy.table}>
                  {row.tableLabel ?? copy.noTable}
                </td>
                <td role="cell" data-label={copy.needs}>
                  {row.dietary.filter((tag) => tag !== "NONE").length > 0 ? (
                    <ul className="pills">
                      {row.dietary
                        .filter((tag) => tag !== "NONE")
                        .map((tag) => (
                          <li key={tag} className="pill">
                            {common.dietary[tag]}
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <span className="muted">{common.none}</span>
                  )}
                </td>
                <td
                  role="cell"
                  data-label={copy.allergy}
                  data-empty={!row.allergySeverity && !row.allergyNotes ? true : undefined}
                >
                  {row.allergySeverity ? (
                    <Badge
                      tone={row.allergySeverity === "SEVERE_ANAPHYLAXIS" ? "danger" : "warning"}
                    >
                      {row.allergySeverity === "SEVERE_ANAPHYLAXIS" ? (
                        <TriangleAlert className="icon" aria-hidden="true" />
                      ) : null}
                      {common.severity[row.allergySeverity]}
                    </Badge>
                  ) : null}
                  {row.allergyNotes ? (
                    <span className="sb-diet-note">{row.allergyNotes}</span>
                  ) : null}
                  {!row.allergySeverity && !row.allergyNotes ? (
                    <span className="muted">{common.none}</span>
                  ) : null}
                </td>
                <td
                  role="cell"
                  data-label={copy.access}
                  data-empty={row.accessibilityNotes ? undefined : true}
                >
                  {row.accessibilityNotes ?? <span className="muted">{common.none}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tables.length > 1 || (tables.length === 1 && tables[0]?.tableLabel !== null) ? (
        <div className="sb-by-table">
          <h3 className="sb-heading">{copy.byTableTitle}</h3>
          <ul className="sb-table-list">
            {tables.map((table) => (
              <li key={table.tableLabel ?? "none"}>
                <span className="sb-table-name">
                  {table.tableLabel ? tableLabelText(table.tableLabel, common.table) : copy.noTable}
                </span>
                <CountPills counts={table.counts} labels={common.dietary} />
                {table.severe > 0 ? (
                  <Badge tone="danger">
                    <TriangleAlert className="icon" aria-hidden="true" />
                    {fillCount(table.severe, copy.severeOne, copy.severe)}
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
