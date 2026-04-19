export type TransactionType = 'CREDIT' | 'DEBIT';

export interface Transaction {
  _id: string;
  type: TransactionType;
  amount: number;
  description: string;
  createdAt: string;
}

export interface TransactionsResponse {
  success: boolean;
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
