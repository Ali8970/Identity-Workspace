import { HttpContextToken } from '@angular/common/http';

/** Suppresses the global error banner for this request (bootstrap probes, etc.). */
export const SILENT_ERROR = new HttpContextToken<boolean>(() => false);
