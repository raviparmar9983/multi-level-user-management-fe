import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../core/config/api-endpoints';
import { BalanceResponse } from '../models/balance.model';
import { RechargeBalanceRequest, RechargeBalanceResponse } from '../models/recharge.model';
import { TransactionsResponse } from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly http = inject(HttpClient);

  getBalance(): Observable<BalanceResponse> {
    return this.http.get<BalanceResponse>(API_ENDPOINTS.users.balance);
  }

  getTransactions(page: number, limit: number): Observable<TransactionsResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('limit', limit);

    return this.http.get<TransactionsResponse>(API_ENDPOINTS.transactions.base, { params });
  }

  rechargeBalance(payload: RechargeBalanceRequest): Observable<RechargeBalanceResponse> {
    return this.http.post<RechargeBalanceResponse>(API_ENDPOINTS.wallet.recharge, payload);
  }
}
