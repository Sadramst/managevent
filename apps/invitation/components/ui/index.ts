/**
 * Shared UI primitives for the invitations app, built from `@managevent/ui/brand.css` classes.
 *
 * Server-compatible: Field (+ TextField, TextAreaField, SelectField), Notice, EmptyState,
 * Stats/StatTile, Badge, Spinner/LoadingBlock, Button.
 * Client components: Modal/Drawer, ConfirmDialog, ToastProvider/useToast, CopyButton, Tabs,
 * Menu, SubmitButton. `useSettle` wraps every server action call made from the browser.
 *
 * Every visible string is a prop, so copy stays in `packages/i18n`. The generic labels
 * ("Close", "Cancel", "Copy", "Copied") default from `UiCopyProvider` in the root layout. Layout helpers
 * (`Container`, `Section`, `SectionHead`, `Card`, `ButtonLink`, `PageHero`, `cx`) come from
 * `@managevent/ui/brand`.
 */
export { Badge, type BadgeProps } from "./Badge";
export {
  Button,
  buttonClass,
  type ButtonProps,
  type ButtonSize,
  type ButtonStyle,
  type ButtonVariant,
} from "./Button";
export { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog";
export {
  CopyButton,
  type CopyButtonProps,
  copyText,
  ManualCopyField,
  type ManualCopyFieldProps,
} from "./CopyButton";
export { Drawer, Modal, type ModalProps } from "./Dialog";
export { EmptyState, type EmptyStateProps } from "./EmptyState";
export {
  Field,
  fieldControlProps,
  type FieldControlProps,
  type FieldError,
  type FieldProps,
  SelectField,
  type SelectFieldProps,
  TextAreaField,
  type TextAreaFieldProps,
  TextField,
  type TextFieldProps,
} from "./Field";
export { Menu, type MenuProps } from "./Menu";
export { Notice, type NoticeProps, type Tone } from "./Notice";
export { LoadingBlock, Spinner, type SpinnerProps } from "./Spinner";
export { Stats, type StatsProps, StatTile, type StatTileProps } from "./StatTile";
export { SubmitButton, type SubmitButtonProps } from "./SubmitButton";
export { type TabItem, Tabs, type TabsProps } from "./Tabs";
export { type ToastApi, ToastProvider, type ToastProviderProps, useToast } from "./Toast";
export { type UiCopy, UiCopyProvider, useUiCopy } from "./UiCopy";
export { useSettle } from "./useSettle";
