import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { FormInputComponent } from '../components/form-input.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormInputComponent],
  template: `
    <section class="auth-shell">
      <div class="auth-card">
        <div class="auth-copy">
          <span class="eyebrow">Password recovery</span>
          <h1>Reset your password</h1>
          <p>Enter your email address and we’ll send reset instructions.</p>
        </div>

        <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()">
          <app-form-input id="forgot-email" label="Email" type="email" autocomplete="email" placeholder="you@example.com" [control]="form.controls.email" [errorMessages]="emailErrors" />

          @if (successMessage) {
            <p class="banner success-banner">{{ successMessage }}</p>
          }

          @if (errorMessage) {
            <p class="banner error-banner">{{ errorMessage }}</p>
          }

          <button class="primary-btn" type="submit" [disabled]="isSubmitting">
            {{ isSubmitting ? 'Sending...' : 'Send reset link' }}
          </button>
        </form>

        <div class="auth-links">
          <p>Remembered it? <a routerLink="/login">Back to login</a></p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .auth-shell { min-height: 100vh; display: grid; place-items: center; padding: 2rem 1rem; }
    .auth-card { width: min(100%, 28rem); background: rgba(255,255,255,0.94); border: 1px solid rgba(148,163,184,0.2); border-radius: 1.5rem; padding: 2rem; box-shadow: 0 24px 50px rgba(15,23,42,0.08); }
    .auth-copy { margin-bottom: 1.5rem; }
    .eyebrow { display: inline-block; margin-bottom: 0.75rem; color: #c2410c; font-weight: 700; font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; }
    h1 { margin: 0 0 0.5rem; font-size: 1.85rem; color: #0f172a; }
    p { margin: 0; color: #475569; }
    .auth-form { display: grid; gap: 1rem; }
    .banner { margin: 0; border-radius: 0.85rem; padding: 0.85rem 1rem; font-size: 0.9rem; }
    .success-banner { background: #ecfdf3; color: #027a48; }
    .error-banner { background: #fef3f2; color: #b42318; }
    .primary-btn { border: 0; border-radius: 0.9rem; padding: 0.95rem 1.15rem; background: linear-gradient(135deg, #ea580c, #f59e0b); color: #fff; font-size: 1rem; font-weight: 700; cursor: pointer; }
    .primary-btn:disabled { opacity: 0.7; cursor: wait; }
    .auth-links { margin-top: 1rem; font-size: 0.95rem; }
    a { color: #1d4ed8; text-decoration: none; font-weight: 600; }
  `]
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly emailErrors = { required: 'Email is required.', email: 'Enter a valid email address.' };
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isSubmitting = true;

    this.authService.forgotPassword(this.form.getRawValue()).pipe(
      finalize(() => (this.isSubmitting = false))
    ).subscribe({
      next: () => {
        this.successMessage = 'If the email exists, reset instructions have been sent.';
      },
      error: (error) => {
        this.errorMessage = error.error?.message ?? 'Unable to send reset instructions.';
      }
    });
  }
}
