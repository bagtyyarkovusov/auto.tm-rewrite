// Red-checkpoint stub: renders nothing so the specs fail on behaviour, not on a missing import.
export function OptionPickerSheet<T extends string>(_props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return null;
}
