import { OperatorFunction, map } from 'rxjs';
import { ApiResponse } from '../../models/api-response.model';

/**
 * Unwraps the Brooch `ApiResponse<T>` envelope, throwing when the payload is absent.
 *
 * Every Brooch endpoint answers `{ statusCode, message, data }`. A 2xx with no `data`
 * is a contract violation rather than an empty result, so it throws and lands in the
 * normal error pipeline instead of surfacing `undefined` to a caller that has already
 * been told it is getting a `T`.
 *
 * Endpoints whose payload is legitimately absent (`204`-style writes) should map to
 * `void` directly rather than reaching for this.
 */
export function unwrapData<T>(): OperatorFunction<ApiResponse<T>, T> {
  return map((response) => {
    if (response.data === undefined) {
      throw new Error(response.message || 'Empty API response');
    }
    return response.data;
  });
}
