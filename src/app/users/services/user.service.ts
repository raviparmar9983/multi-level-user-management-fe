import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../core/config/api-endpoints';

export interface UserTreeApiNode {
  _id: string;
  name: string;
  balance: number;
  level: number;
  hasChildren: boolean;
}

export interface ChildrenPagination {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

export interface UserChildrenResponse {
  data: UserTreeApiNode[];
  pagination: ChildrenPagination;
  user: {
    balance: number;
    name: string;
    level: number;
  }
}

export interface CreateChildUserPayload {
  name: string;
  email: string;
  password: string;
}

export interface TransferBalancePayload {
  userId: string;
  amount: number;
}

export interface AdminUsersPagination {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

export interface AdminUsersResponse {
  success: true;
  users: UserTreeApiNode[];
  pagination: AdminUsersPagination;
}

export interface ChangeChildPasswordPayload {
  userId: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  getChildren(userId: string, page: number, limit: number): Observable<UserChildrenResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('limit', limit);

    return this.http.get<UserChildrenResponse>(`${API_ENDPOINTS.users.base}/${userId}/children`, { params });
  }

  createChildUser(payload: CreateChildUserPayload): Observable<unknown> {
    return this.http.post(API_ENDPOINTS.users.base, payload);
  }

  getAdminUsers(page: number, limit: number): Observable<AdminUsersResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('limit', limit);

    return this.http.get<AdminUsersResponse>(API_ENDPOINTS.adminUsers, { params });
  }

  transferBalance(payload: TransferBalancePayload): Observable<unknown> {
    return this.http.post(API_ENDPOINTS.wallet.transfer, payload);
  }

  transferBalanceAdmin(payload: TransferBalancePayload): Observable<unknown> {
    return this.http.post(API_ENDPOINTS.adminTransfer, payload);
  }

  changeChildPassword(payload: ChangeChildPasswordPayload): Observable<unknown> {
    return this.http.post(API_ENDPOINTS.users.changePassword, payload);
  }
}
