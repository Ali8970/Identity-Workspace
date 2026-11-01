import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_BASE } from '../http/api-base';
import { HttpActivityService } from '../loading/http-activity.service';
import { SKIP_LOADING } from '../loading/loading-context';
import { loadingInterceptor } from './loading.interceptor';

/** Ordinary tenant-scoped API URLs (core may not import the access domain). */
const MEMBERSHIPS_URL = `${API_BASE}/memberships`;
const ROLES_URL = `${API_BASE}/roles`;

describe('loadingInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let activity: HttpActivityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([loadingInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    activity = TestBed.inject(HttpActivityService);
  });

  afterEach(() => backend.verify());

  it('counts an API call for the duration of the request', () => {
    expect(activity.busy()).toBe(false);

    http.get(MEMBERSHIPS_URL).subscribe({ error: () => undefined });
    expect(activity.busy()).toBe(true);

    backend.expectOne(MEMBERSHIPS_URL).flush({ statusCode: 200, message: 'ok', data: [] });
    expect(activity.busy()).toBe(false);
  });

  it('releases the count when the request fails', () => {
    http.get(MEMBERSHIPS_URL).subscribe({ error: () => undefined });
    backend
      .expectOne(MEMBERSHIPS_URL)
      .flush({}, { status: 500, statusText: 'Server Error' });

    expect(activity.busy()).toBe(false);
  });

  it('releases the count when the caller unsubscribes', () => {
    const subscription = http
      .get(MEMBERSHIPS_URL)
      .subscribe({ error: () => undefined });
    expect(activity.busy()).toBe(true);

    subscription.unsubscribe();
    expect(activity.busy()).toBe(false);
    backend.expectOne(MEMBERSHIPS_URL);
  });

  it('stays busy until the last of several parallel calls settles', () => {
    http.get(MEMBERSHIPS_URL).subscribe({ error: () => undefined });
    http.get(ROLES_URL).subscribe({ error: () => undefined });

    backend.expectOne(MEMBERSHIPS_URL).flush({ statusCode: 200, message: 'ok', data: [] });
    expect(activity.busy()).toBe(true);

    backend.expectOne(ROLES_URL).flush({ statusCode: 200, message: 'ok', data: [] });
    expect(activity.busy()).toBe(false);
  });

  it('ignores requests marked SKIP_LOADING', () => {
    http
      .get(MEMBERSHIPS_URL, { context: new HttpContext().set(SKIP_LOADING, true) })
      .subscribe({ error: () => undefined });

    expect(activity.busy()).toBe(false);
    backend.expectOne(MEMBERSHIPS_URL).flush({ statusCode: 200, message: 'ok', data: [] });
  });

  it('ignores non-API requests such as i18n bundles', () => {
    http.get('/i18n/en.json').subscribe({ error: () => undefined });

    expect(activity.busy()).toBe(false);
    backend.expectOne('/i18n/en.json').flush({});
  });
});
