import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, finalize, map, shareReplay, tap, throwError } from 'rxjs';
import { API_ENDPOINTS } from '../../core/config/api-endpoints';

export type UserRole = 'ADMIN' | 'USER';

export interface UserInfo {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
}

interface JwtPayload {
  userId: string;
  role: UserRole;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: UserInfo;
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
  private readonly userStorageKey = 'auth_user';
  private readonly authStateSubject = new BehaviorSubject<AuthState>(this.buildAuthState());
  private refreshTokenRequest$: Observable<AuthTokens> | null = null;

  readonly authState$ = this.authStateSubject.asObservable();
  readonly isAuthenticated$ = this.authState$.pipe(map((state) => state.isAuthenticated));

  register(payload: RegisterPayload): Observable<void> {
    return this.http.post<void>(API_ENDPOINTS.auth.register, payload);
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(API_ENDPOINTS.auth.login, payload).pipe(
      tap((response) => this.setSession(response, response.user))
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
    localStorage.removeItem(this.userStorageKey);
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

  private setSession(tokens: AuthTokens, user?: UserInfo): void {
    localStorage.setItem(this.accessTokenKey, tokens.accessToken);
    localStorage.setItem(this.refreshTokenKey, tokens.refreshToken);

    if (user) {
      localStorage.setItem(this.userStorageKey, JSON.stringify(user));
    }

    this.authStateSubject.next(this.buildAuthState());
  }

  private buildAuthState(): AuthState {
    const accessToken = this.getAccessToken();
    const storedUser = this.getStoredUser();

    if (!accessToken || !storedUser) {
      localStorage.removeItem(this.accessTokenKey);
      localStorage.removeItem(this.refreshTokenKey);
      localStorage.removeItem(this.userStorageKey);
      return { isAuthenticated: false, role: null, userId: null };
    }

    return {
      isAuthenticated: true,
      role: storedUser.role,
      userId: storedUser.userId
    };
  }

  private getStoredUser(): UserInfo | null {
    try {
      const json = localStorage.getItem(this.userStorageKey);
      return json ? JSON.parse(json) as UserInfo : null;
    } catch {
      return null;
    }
  }
}
