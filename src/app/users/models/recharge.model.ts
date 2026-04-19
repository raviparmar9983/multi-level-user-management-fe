export interface RechargeBalanceRequest {
  amount: number;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

export interface RechargeBalanceResponse {
  success: boolean;
  message?: string;
}
