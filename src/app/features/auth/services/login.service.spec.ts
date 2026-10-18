import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SessionStore } from '../../../core/auth/session.store';
import { LoginService } from './login.service';

describe('LoginService activation hand-off', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: SessionStore, useValue: {} },
      ],
    });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('treats activated=1 as a finished set-password', () => {
    window.history.replaceState({}, '', '/login?activated=1');

    const state = TestBed.inject(LoginService).readQueryState();

    expect(state.justActivated).toBe(true);
    expect(state.justOnboarded).toBe(false);
  });
});
