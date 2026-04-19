import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, finalize, map, shareReplay, tap, throwError } from 'rxjs';
import { API_ENDPOINTS } from '../../core/config/api-endpoints';

export type UserRole = 'ADMIN' | 'USER';

interface JwtPayload {
  userId: string;
  role: UserRole;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  role: UserRole | null;
  userId: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly accessTokenKey = 'auth_access_token';
  private readonly refreshTokenKey = 'auth_refresh_token';
  private readonly authStateSubject = new BehaviorSubject<AuthState>(this.buildAuthState());
  private refreshTokenRequest$: Observable<AuthTokens> | null = null;

  readonly authState$ = this.authStateSubject.asObservable();
  readonly isAuthenticated$ = this.authState$.pipe(map((state) => state.isAuthenticated));

  register(payload: RegisterPayload): Observable<void> {
    return this.http.post<void>(API_ENDPOINTS.auth.register, payload);
  }

  login(payload: LoginPayload): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(API_ENDPOINTS.auth.login, payload).pipe(
      tap((tokens) => this.setSession(tokens))
    );
  }

  refreshToken(): Observable<AuthTokens> {
    const token = this.getRefreshToken();

    if (!token) {
      this.logout();
      return throwError(() => new Error('Refresh token is missing.'));
    }

    if (!this.refreshTokenRequest$) {
      this.refreshTokenRequest$ = this.http.post<AuthTokens>(API_ENDPOINTS.auth.refreshToken, { token }).pipe(
        tap((tokens) => this.setSession(tokens)),
        catchError((error) => {
          this.logout();
          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshTokenRequest$ = null;
        }),
        shareReplay(1)
      );
    }

    return this.refreshTokenRequest$;
  }

  forgotPassword(payload: { email: string }): Observable<void> {
    return this.http.post<void>(API_ENDPOINTS.auth.forgotPassword, payload);
  }

  resetPassword(payload: { token: string; password: string }): Observable<void> {
    return this.http.post<void>(API_ENDPOINTS.auth.resetPassword, payload);
  }

  verifyEmail(token: string): Observable<void> {
    return this.http.get<void>(API_ENDPOINTS.auth.verify, {
      params: { token }
    });
  }

  logout(redirectTo = '/login'): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    this.authStateSubject.next({ isAuthenticated: false, role: null, userId: null });
    void this.router.navigateByUrl(redirectTo);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  getUserRole(): UserRole | null {
    return this.authStateSubject.value.role;
  }

  getCurrentUserId(): string | null {
    return this.authStateSubject.value.userId;
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'ADMIN';
  }

  hasRole(role: UserRole): boolean {
    return this.getUserRole() === role || this.isAdmin();
  }

  private setSession(tokens: AuthTokens): void {
    localStorage.setItem(this.accessTokenKey, tokens.accessToken);
    localStorage.setItem(this.refreshTokenKey, tokens.refreshToken);
    this.authStateSubject.next(this.buildAuthState(tokens.accessToken));
  }

  private buildAuthState(accessToken = this.getAccessToken()): AuthState {
    if (!accessToken) {
      return { isAuthenticated: false, role: null, userId: null };
    }

    const payload = this.decodeToken(accessToken);

    if (!payload || this.isTokenExpired(payload)) {
      localStorage.removeItem(this.accessTokenKey);
      localStorage.removeItem(this.refreshTokenKey);
      return { isAuthenticated: false, role: null, userId: null };
    }

    return {
      isAuthenticated: true,
      role: payload.role,
      userId: payload.userId
    };
  }

  private decodeToken(token: string): JwtPayload | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) {
        return null;
      }

      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
      return JSON.parse(atob(padded)) as JwtPayload;
    } catch {
      return null;
    }
  }

  private isTokenExpired(payload: JwtPayload): boolean {
    return typeof payload.exp === 'number' ? payload.exp * 1000 <= Date.now() : false;
  }
}
