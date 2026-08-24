export { AuthProvider, useAuth } from "./AuthProvider";
export type { AuthContextValue } from "./AuthProvider";
export {
  clearAccessToken,
  getAccessToken,
  onSessionExpired,
  resetSession,
  setAccessToken,
} from "./session";
export type {
  ChangePasswordInput,
  LoginResponse,
  PublicUser,
  Role,
  StatutCompte,
  StatutVendeur,
  UpdateMeInput,
  UpdateMeResponse,
} from "./types";

export { devenirVendeur, updateMe } from "./api";

export {
  describeDevenirVendeurError,
  describeDevenirVendeurFormError,
  describeUpdateMeFormError,
} from "./errors";
export type { DevenirVendeurFormError, DevenirVendeurFormField } from "./errors";
export type { UpdateMeFormError, UpdateMeFormField } from "./errors";

export {
  RETURN_TO_PARAM,
  buildInscriptionHref,
  buildLoginHref,
  isSafeReturnPath,
  resolveReturnTo,
} from "./return-to";
