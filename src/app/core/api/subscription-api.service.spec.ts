import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_ROUTES } from '../../constants/api-routes';
import { SubscriptionApi } from './subscription-api.service';

const OPERATION_ID = '11111111-2222-3333-4444-555555555555';

/**
 * These cases exist to pin the money contract, not the plumbing: the browser sends a package
 * id, a token or a provider payment id — never an amount, a currency, a price or a status. A
 * request body growing a field here would be the first step toward a client-priced purchase.
 */
describe('SubscriptionApi', () => {
  let api: SubscriptionApi;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    api = TestBed.inject(SubscriptionApi);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('starts a subscription with the package id alone', () => {
    api.start({ packageId: 'pkg-1' }).subscribe();

    const request = backend.expectOne(API_ROUTES.subscriptions);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ packageId: 'pkg-1' });
    expect(request.request.withCredentials).toBe(true);
    request.flush({ statusCode: 200, message: 'ok', data: { operationId: OPERATION_ID } });
  });

  it('charges with the token and nothing else', () => {
    api.pay(OPERATION_ID, { token: 'token_1' }).subscribe();

    const request = backend.expectOne(API_ROUTES.paySubscriptionOperation(OPERATION_ID));

    expect(request.request.body).toEqual({ token: 'token_1' });
    request.flush({ statusCode: 200, message: 'ok', data: { paymentState: 'Paid' } });
  });

  it('verifies with the provider payment id, never the callback status', () => {
    api.verifyPayment(OPERATION_ID, { providerPaymentId: 'pay_1' }).subscribe();

    const request = backend.expectOne(API_ROUTES.verifySubscriptionPayment(OPERATION_ID));

    expect(request.request.body).toEqual({ providerPaymentId: 'pay_1' });
    request.flush({ statusCode: 200, message: 'ok', data: { paymentState: 'Paid' } });
  });

  it('unwraps the operation status from the response envelope', async () => {
    const status = { operationId: OPERATION_ID, status: 'Completed' };
    const read = new Promise((resolve) => api.operation(OPERATION_ID).subscribe(resolve));

    backend
      .expectOne(API_ROUTES.subscriptionOperation(OPERATION_ID))
      .flush({ statusCode: 200, message: 'ok', data: status });

    await expect(read).resolves.toEqual(status);
  });

  it('sends an empty body on both retries so neither can carry an amount', () => {
    api.retryPayment(OPERATION_ID).subscribe();
    api.retryProvisioning(OPERATION_ID).subscribe();

    const retryPayment = backend.expectOne(API_ROUTES.retrySubscriptionPayment(OPERATION_ID));
    const retryProvisioning = backend.expectOne(
      API_ROUTES.retrySubscriptionProvisioning(OPERATION_ID),
    );

    expect(retryPayment.request.body).toEqual({});
    expect(retryProvisioning.request.body).toEqual({});
    retryPayment.flush({ statusCode: 200, message: 'ok', data: { operationId: OPERATION_ID } });
    retryProvisioning.flush({ statusCode: 200, message: 'ok', data: { operationId: OPERATION_ID } });
  });
});
