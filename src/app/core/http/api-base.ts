import { environment } from '@env/environment';

/** The Brooch API root for this build, without a trailing slash. */
export const API_BASE = environment.apiBaseUrl.replace(/\/$/, '');
