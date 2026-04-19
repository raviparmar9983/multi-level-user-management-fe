import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { Transaction } from '../users/models/transaction.model';
import { WalletService } from '../users/services/wallet.service';
import { AdminUsersListComponent } from './admin-users-list.component';

function expiryValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();

  if (!value) {
    return null;
  }

  const match = /^(\d{2})\/(\d{2})$/.exec(value);

  if (!match) {
    return { expiryFormat: true };
  }

  const month = Number(match[1]);

  return month >= 1 && month <= 12 ? null : { expiryMonth: true };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AdminUsersListComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly walletService = inject(WalletService);
  private readonly fb = inject(FormBuilder);

  @ViewChild('scrollAnchor') private scrollAnchor?: ElementRef<HTMLDivElement>;

  private observer?: IntersectionObserver;
  private readonly pageSize = 10;
  private currentPage = 1;

  readonly rechargeForm = this.fb.nonNullable.group({
    amount: [500, [Validators.required, Validators.min(1)]],
    cardNumber: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
    expiry: ['', [Validators.required, expiryValidator]],
    cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]]
  });

  balance = 0;
  totalTransactions = 0;
  transactions: Transaction[] = [];

  isLoadingBalance = false;
  isLoadingTransactions = false;
  isLoadingMore = false;
  isSubmittingRecharge = false;
  hasMoreTransactions = true;
  isRechargeModalOpen = false;

  balanceError = '';
  transactionsError = '';
  rechargeError = '';
  rechargeSuccess = '';

  get role(): string | null {
    return this.authService.getUserRole();
  }

  get userId(): string | null {
    return this.authService.getCurrentUserId();
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get isUserDashboard(): boolean {
    return this.role === 'USER';
  }

  get showInitialTransactionsLoader(): boolean {
    return this.isLoadingTransactions && this.transactions.length === 0;
  }

  ngOnInit(): void {
    if (!this.isUserDashboard) {
      return;
    }

    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    this.createObserver();
    this.tryFillViewport();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  logout(): void {
    this.authService.logout();
  }

  openRechargeModal(): void {
    this.rechargeError = '';
    this.rechargeSuccess = '';
    this.isRechargeModalOpen = true;
  }

  closeRechargeModal(): void {
    if (this.isSubmittingRecharge) {
      return;
    }

    this.isRechargeModalOpen = false;
    this.rechargeError = '';
    this.rechargeSuccess = '';
  }

  closeRechargeModalFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeRechargeModal();
    }
  }

  retryBalance(): void {
    this.loadBalance();
  }

  retryTransactions(): void {
    this.loadTransactions(true);
  }

  submitRecharge(): void {
    if (!this.isUserDashboard) {
      return;
    }

    if (this.rechargeForm.invalid) {
      this.rechargeForm.markAllAsTouched();
      return;
    }

    this.rechargeError = '';
    this.rechargeSuccess = '';
    this.isSubmittingRecharge = true;

    this.walletService.rechargeBalance(this.rechargeForm.getRawValue()).pipe(
      finalize(() => {
        this.isSubmittingRecharge = false;
      })
    ).subscribe({
      next: (response) => {
        if (!response.success) {
          this.rechargeError = response.message ?? 'Recharge could not be completed.';
          return;
        }

        this.rechargeSuccess = response.message ?? 'Balance recharged successfully.';
        this.rechargeForm.reset({
          amount: 500,
          cardNumber: '',
          expiry: '',
          cvv: ''
        });
        this.loadDashboardData();
        setTimeout(() => {
          this.closeRechargeModal();
        }, 700);
      },
      error: (error) => {
        this.rechargeError = error.error?.message ?? 'Recharge could not be completed.';
      }
    });
  }

  getControlError(controlName: 'amount' | 'cardNumber' | 'expiry' | 'cvv'): string {
    const control = this.rechargeForm.controls[controlName];
    const errors = control.errors;

    if (!errors || !(control.touched || control.dirty)) {
      return '';
    }

    const firstKey = Object.keys(errors)[0];
    const messages: Record<string, Record<string, string>> = {
      amount: {
        required: 'Amount is required.',
        min: 'Amount must be greater than 0.'
      },
      cardNumber: {
        required: 'Card number is required.',
        pattern: 'Card number must be exactly 16 digits.'
      },
      expiry: {
        required: 'Expiry is required.',
        expiryFormat: 'Use MM/YY format.',
        expiryMonth: 'Enter a valid expiry month.'
      },
      cvv: {
        required: 'CVV is required.',
        pattern: 'CVV must be 3 or 4 digits.'
      }
    };

    return messages[controlName][firstKey] ?? 'This field is invalid.';
  }

  trackByTransactionId(_index: number, transaction: Transaction): string {
    return transaction._id;
  }

  protected getTransactionAmountPrefix(transaction: Transaction): string {
    return transaction.type === 'CREDIT' ? '+' : '-';
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    if (this.isRechargeModalOpen) {
      this.closeRechargeModal();
    }
  }

  private loadDashboardData(): void {
    this.loadBalance();
    this.loadTransactions(true);
  }

  private loadBalance(): void {
    if (!this.isUserDashboard) {
      return;
    }

    this.balanceError = '';
    this.isLoadingBalance = true;

    this.walletService.getBalance().pipe(
      finalize(() => {
        this.isLoadingBalance = false;
      })
    ).subscribe({
      next: (response) => {
        if (!response.success) {
          this.balanceError = 'Unable to load your wallet balance right now.';
          return;
        }

        this.balance = response.balance;
      },
      error: (error) => {
        this.balanceError = error.error?.message ?? 'Unable to load your wallet balance right now.';
      }
    });
  }

  private loadTransactions(reset: boolean): void {
    if (!this.isUserDashboard) {
      return;
    }

    if ((this.isLoadingTransactions || this.isLoadingMore) && !reset) {
      return;
    }

    if (!reset && !this.hasMoreTransactions) {
      return;
    }

    if (reset) {
      this.currentPage = 1;
      this.transactions = [];
      this.totalTransactions = 0;
      this.hasMoreTransactions = true;
      this.transactionsError = '';
      this.isLoadingTransactions = true;
    } else {
      this.isLoadingMore = true;
    }

    this.walletService.getTransactions(this.currentPage, this.pageSize).pipe(
      finalize(() => {
        this.isLoadingTransactions = false;
        this.isLoadingMore = false;
        this.tryFillViewport();
      })
    ).subscribe({
      next: (response) => {
        if (!response.success) {
          this.transactionsError = 'Unable to load transactions right now.';
          return;
        }

        this.totalTransactions = response.total;
        this.transactions = reset ? response.transactions : [...this.transactions, ...response.transactions];
        this.currentPage += 1;
        this.hasMoreTransactions = response.page < response.totalPages && response.transactions.length > 0;
      },
      error: (error) => {
        this.transactionsError = error.error?.message ?? 'Unable to load transactions right now.';
      }
    });
  }

  private createObserver(): void {
    if (!this.scrollAnchor || !this.isUserDashboard) {
      return;
    }

    this.observer?.disconnect();
    this.observer = new IntersectionObserver(
      (entries) => {
        const anchorIsVisible = entries.some((entry) => entry.isIntersecting);

        if (anchorIsVisible) {
          this.loadTransactions(false);
        }
      },
      {
        rootMargin: '0px 0px 240px 0px'
      }
    );

    this.observer.observe(this.scrollAnchor.nativeElement);
  }

  private tryFillViewport(): void {
    if (!this.isUserDashboard || !this.hasMoreTransactions || this.isLoadingTransactions || this.isLoadingMore) {
      return;
    }

    queueMicrotask(() => {
      const documentHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;

      if (documentHeight <= viewportHeight + 120) {
        this.loadTransactions(false);
      }
    });
  }
}
