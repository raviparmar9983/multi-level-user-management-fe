import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="auth-shell">
      <div class="auth-card">
        <span class="eyebrow">Email verification</span>

        @if (isLoading) {
          <h1>Verifying your email...</h1>
          <p>Please wait while we confirm your account.</p>
        } @else if (isVerified) {
          <h1>Email verified successfully</h1>
          <p>Your account is ready to use. You can continue to login.</p>
        } @else {
          <h1>Verification could not be completed</h1>
          <p>{{ errorMessage }}</p>
        }

        <a class="primary-btn" routerLink="/login">Go to login</a>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .auth-shell { min-height: 100vh; display: grid; place-items: center; padding: 2rem 1rem; }
    .auth-card { width: min(100%, 28rem); background: rgba(255,255,255,0.94); border: 1px solid rgba(148,163,184,0.2); border-radius: 1.5rem; padding: 2rem; box-shadow: 0 24px 50px rgba(15,23,42,0.08); text-align: center; }
    .eyebrow { display: inline-block; margin-bottom: 0.75rem; color: #0f766e; font-weight: 700; font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; }
    h1 { margin: 0 0 0.5rem; font-size: 1.85rem; color: #0f172a; }
    p { margin: 0 0 1.5rem; color: #475569; }
    .primary-btn { display: inline-flex; justify-content: center; border: 0; border-radius: 0.9rem; padding: 0.95rem 1.15rem; background: linear-gradient(135deg, #0f766e, #2563eb); color: #fff; font-size: 1rem; font-weight: 700; text-decoration: none; }
  `]
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  isLoading = true;
  isVerified = false;
  errorMessage = 'The verification link is invalid or has expired.';

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.isLoading = false;
      return;
    }

    this.authService.verifyEmail(token).pipe(
      finalize(() => (this.isLoading = false))
    ).subscribe({
      next: () => {
        this.isVerified = true;
      },
      error: (error) => {
        this.errorMessage = error.error?.message ?? this.errorMessage;
      }
    });
  }
}
