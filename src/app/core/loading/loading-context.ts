import { HttpContextToken } from '@angular/common/http';

/**
 * Keeps a request out of the global loading indicator — background refreshes and
 * silent probes should not flicker the bar while the user is reading the page.
 */
export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);
