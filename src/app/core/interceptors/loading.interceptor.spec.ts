import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_ROUTES } from '../../constants/api-routes';
import { HttpActivityService } from '../loading/http-activity.service';
import { SKIP_LOADING } from '../loading/loading-context';
import { loadingInterceptor } from './loading.interceptor';

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

    http.get(API_ROUTES.memberships).subscribe({ error: () => undefined });
    expect(activity.busy()).toBe(true);

    backend.expectOne(API_ROUTES.memberships).flush({ statusCode: 200, message: 'ok', data: [] });
    expect(activity.busy()).toBe(false);
  });

  it('releases the count when the request fails', () => {
    http.get(API_ROUTES.memberships).subscribe({ error: () => undefined });
    backend
      .expectOne(API_ROUTES.memberships)
      .flush({}, { status: 500, statusText: 'Server Error' });

    expect(activity.busy()).toBe(false);
  });

  it('releases the count when the caller unsubscribes', () => {
    const subscription = http
      .get(API_ROUTES.memberships)
      .subscribe({ error: () => undefined });
    expect(activity.busy()).toBe(true);

    subscription.unsubscribe();
    expect(activity.busy()).toBe(false);
    backend.expectOne(API_ROUTES.memberships);
  });

  it('stays busy until the last of several parallel calls settles', () => {
    http.get(API_ROUTES.memberships).subscribe({ error: () => undefined });
    http.get(API_ROUTES.roles).subscribe({ error: () => undefined });

    backend.expectOne(API_ROUTES.memberships).flush({ statusCode: 200, message: 'ok', data: [] });
    expect(activity.busy()).toBe(true);

    backend.expectOne(API_ROUTES.roles).flush({ statusCode: 200, message: 'ok', data: [] });
    expect(activity.busy()).toBe(false);
  });

  it('ignores requests marked SKIP_LOADING', () => {
    http
      .get(API_ROUTES.memberships, { context: new HttpContext().set(SKIP_LOADING, true) })
      .subscribe({ error: () => undefined });

    expect(activity.busy()).toBe(false);
    backend.expectOne(API_ROUTES.memberships).flush({ statusCode: 200, message: 'ok', data: [] });
  });

  it('ignores non-API requests such as i18n bundles', () => {
    http.get('/i18n/en.json').subscribe({ error: () => undefined });

    expect(activity.busy()).toBe(false);
    backend.expectOne('/i18n/en.json').flush({});
  });
});
