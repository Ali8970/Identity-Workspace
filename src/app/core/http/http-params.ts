import { HttpParams } from '@angular/common/http';

/** Drops undefined entries so we never send `?search=undefined`. */
export function toParams(
  values: Record<string, string | boolean | undefined>,
): HttpParams | undefined {
  let params = new HttpParams();
  let any = false;
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === '') {
      continue;
    }
    params = params.set(key, value);
    any = true;
  }
  return any ? params : undefined;
}
