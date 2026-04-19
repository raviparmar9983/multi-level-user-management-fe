import { environment } from '../../../environments/environment';

const joinUrl = (baseUrl: string, path: string): string => `${baseUrl}${path}`;

export const API_ENDPOINTS = {
  auth: {
    base: joinUrl(environment.api.baseUrl, environment.api.auth),
    register: joinUrl(environment.api.baseUrl, `${environment.api.auth}/register`),
    login: joinUrl(environment.api.baseUrl, `${environment.api.auth}/login`),
    refreshToken: joinUrl(environment.api.baseUrl, `${environment.api.auth}/refresh-token`),
    forgotPassword: joinUrl(environment.api.baseUrl, `${environment.api.auth}/forgot-password`),
    resetPassword: joinUrl(environment.api.baseUrl, `${environment.api.auth}/reset-password`),
    verify: joinUrl(environment.api.baseUrl, `${environment.api.auth}/verify`)
  },
  users: {
    base: joinUrl(environment.api.baseUrl, environment.api.users),
    balance: joinUrl(environment.api.baseUrl, `${environment.api.users}/balance`),
    changePassword: joinUrl(environment.api.baseUrl, `${environment.api.users}/change-password`)
  },
  wallet: {
    base: joinUrl(environment.api.baseUrl, environment.api.wallet),
    recharge: joinUrl(environment.api.baseUrl, `${environment.api.wallet}/recharge`),
    transfer: joinUrl(environment.api.baseUrl, `${environment.api.wallet}/transfer`)
  },
  adminUsers: joinUrl(environment.api.baseUrl, environment.api.adminUsers),
  adminTransfer: joinUrl(environment.api.baseUrl, environment.api.adminTransfer),
  transactions: {
    base: joinUrl(environment.api.baseUrl, environment.api.transactions)
  }
} as const;
