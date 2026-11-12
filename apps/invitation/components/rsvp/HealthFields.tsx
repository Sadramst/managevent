"use client";

import type { InvitationGuestCopy } from "@managevent/i18n";
import { SelectField, TextAreaField } from "@/components/ui/Field";
import {
  ALLERGY_SEVERITIES,
  type AllergySeverity,
  DIETARY_TAGS,
  hasAllergyTag,
  type HealthDraft,
  MAX_NOTES_LENGTH,
  type RsvpRules,
  toggleDietaryTag,
} from "./model";

export interface HealthFieldsProps {
  /** Prefix for the control ids, unique per person. */
  idPrefix: string;
  /** The person these details are about, for the group label. */
  name: string;
  health: HealthDraft;
  rules: RsvpRules;
  /** The id and message of the severity error, when there is one. */
  severityId: string;
  severityError?: string | undefined;
  optionalLabel: string;
  copy: InvitationGuestCopy["rsvp"];
  onChange: (health: HealthDraft) => void;
}

/**
 * Food and access questions for one person, limited to what the host asks for. Allergy details
 * appear only beside an allergy tag. These are health information: nothing here is sent without
 * the consent box in the form.
 */
export function HealthFields({
  idPrefix,
  name,
  health,
  rules,
  severityId,
  severityError,
  optionalLabel,
  copy,
  onChange,
}: HealthFieldsProps) {
  const allergy = rules.askDietary && hasAllergyTag(health);

  return (
    <div className="inv-health">
      {rules.askDietary ? (
        <fieldset className="inv-tags">
          <legend>{copy.dietaryLegend.replace("{name}", name)}</legend>
          <p className="help">{copy.dietaryHint}</p>
          <div className="inv-tag-list">
            {DIETARY_TAGS.map((tag) => {
              const checked = health.dietary.includes(tag);
              return (
                <label key={tag} className="inv-tag" data-checked={checked}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onChange(toggleDietaryTag(health, tag))}
                  />
                  <span>{copy.dietary[tag]}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {allergy ? (
        <div className="inv-health-allergy">
          <SelectField
            id={severityId}
            label={copy.allergySeverityLabel}
            error={severityError}
            value={health.allergySeverity}
            onChange={(event) =>
              onChange({ ...health, allergySeverity: event.target.value as AllergySeverity | "" })
            }
          >
            <option value="">{copy.allergySeverityPlaceholder}</option>
            {ALLERGY_SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>
                {copy.allergySeverity[severity]}
              </option>
            ))}
          </SelectField>
          <TextAreaField
            id={`${idPrefix}-allergy-notes`}
            label={copy.allergyNotesLabel}
            hint={copy.allergyNotesHint}
            optional={optionalLabel}
            rows={2}
            maxLength={MAX_NOTES_LENGTH}
            value={health.allergyNotes}
            onChange={(event) => onChange({ ...health, allergyNotes: event.target.value })}
          />
        </div>
      ) : null}

      {rules.askAccessibility ? (
        <TextAreaField
          id={`${idPrefix}-access`}
          label={copy.accessibilityLabel}
          hint={copy.accessibilityHint}
          optional={optionalLabel}
          rows={2}
          maxLength={MAX_NOTES_LENGTH}
          value={health.accessibilityNotes}
          onChange={(event) => onChange({ ...health, accessibilityNotes: event.target.value })}
        />
      ) : null}
    </div>
  );
}
