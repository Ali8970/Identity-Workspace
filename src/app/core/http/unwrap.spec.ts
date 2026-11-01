import { firstValueFrom, of } from 'rxjs';
import { apiData, unwrapData } from './unwrap';

describe('API envelope', () => {
  it('returns data, including falsy payloads', async () => {
    expect(apiData({ statusCode: 200, message: 'ok', data: [] })).toEqual([]);
    expect(apiData({ statusCode: 200, message: 'ok', data: null })).toBeNull();
    expect(await firstValueFrom(of({ statusCode: 200, message: 'ok', data: 0 }).pipe(unwrapData()))).toBe(0);
  });

  it('treats a 2xx without data as a contract violation, with the server message', () => {
    expect(() => apiData({ statusCode: 200, message: 'Gone fishing' })).toThrow('Gone fishing');
    expect(() => apiData({ statusCode: 200, message: '' })).toThrow('Empty API response');
  });
});
