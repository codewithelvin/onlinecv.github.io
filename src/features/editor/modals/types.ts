/** Shared props for every item-editor modal (spec §10.2 FR-14). */
export interface ItemModalProps<V> {
  open: boolean;
  title: string;
  defaultValues: V;
  /** Called with validated values on save. The parent persists + closes. */
  onSubmit: (values: V) => void;
  /** Cancel / close without saving. */
  onCancel: () => void;
}
