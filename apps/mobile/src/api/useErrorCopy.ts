import { useTranslation } from "react-i18next";

import { mapErrorToCopy } from "./getErrorCopy";

export function useErrorCopy(error: unknown) {
  const { t } = useTranslation("common");
  return mapErrorToCopy(error, t);
}
