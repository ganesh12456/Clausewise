import { HttpError } from "./http.ts";
import { RecordError } from "./server/application/records.ts";
import { OutcomeUnknownError } from "./server/catalyst/store.ts";
export function storageError(error: unknown): never {
  if (error instanceof RecordError)
    throw new HttpError(
      error.message,
      error.code === "not_found" ? 404 : error.code === "conflict" ? 409 : 400,
    );
  if (error instanceof OutcomeUnknownError)
    throw new HttpError(error.message, 503);
  throw error;
}
