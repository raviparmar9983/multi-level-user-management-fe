import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_ENDPOINTS } from '../../core/config/api-endpoints';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const accessToken = authService.getAccessToken();
  const isRefreshRequest = request.url === API_ENDPOINTS.auth.refreshToken;
  const isAuthRequest = request.url.startsWith(API_ENDPOINTS.auth.base);

  const requestWithAuth = accessToken
    ? request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : request;

  return next(requestWithAuth).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isRefreshRequest || !authService.getRefreshToken()) {
        return throwError(() => error);
      }

      if (isAuthRequest && !request.url.includes('/verify')) {
        return throwError(() => error);
      }

      return authService.refreshToken().pipe(
        switchMap((tokens) =>
          next(request.clone({ setHeaders: { Authorization: `Bearer ${tokens.accessToken}` } }))
        ),
        catchError((refreshError) => throwError(() => refreshError))
      );
    })
  );
};
