import { Service, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { AuthApi } from './auth-api.service';

@Service()
export class CsrfService {
  private readonly authApi = inject(AuthApi);
  private readonly token = signal<string | null>(null);

  readonly current = this.token.asReadonly();

  prime(): Observable<string | null> {
    return this.authApi.csrf().pipe(
      tap((response) => this.token.set(response.token)),
      map((response) => response.token),
    );
  }

  invalidate(): void {
    this.token.set(null);
  }

  getToken(): string | null {
    return this.token();
  }
}
