export { AuthProvider, useAuth } from "./AuthProvider";
export type { AuthContextValue } from "./AuthProvider";
export {
  clearAccessToken,
  getAccessToken,
  onSessionExpired,
  resetSession,
  setAccessToken,
} from "./session";
export type { LoginResponse, PublicUser, Role, StatutCompte, StatutVendeur } from "./types";

export { devenirVendeur } from "./api";

export { describeDevenirVendeurError, describeDevenirVendeurFormError } from "./errors";
export type { DevenirVendeurFormError, DevenirVendeurFormField } from "./errors";

export {
  RETURN_TO_PARAM,
  buildInscriptionHref,
  buildLoginHref,
  isSafeReturnPath,
  resolveReturnTo,
} from "./return-to";
