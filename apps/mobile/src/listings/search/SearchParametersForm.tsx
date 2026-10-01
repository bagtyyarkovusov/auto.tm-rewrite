import type { ListingFilter } from "./useListingFilters";

interface SearchParametersFormProps {
  /** The filters the form opens with: what Results is showing, or the Model picker's choice. */
  initial: ListingFilter;
  /** True when a Results screen sits below this form, so Show N updates it in place. */
  returnToResults: boolean;
  /** Back discards unapplied edits. */
  onBack: () => void;
}

// Red-checkpoint stub (ADR-0070): the form is built in the next commit.
export function SearchParametersForm(_props: SearchParametersFormProps) {
  return null;
}
