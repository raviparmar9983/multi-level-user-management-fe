import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { FormInputComponent } from '../components/form-input.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormInputComponent],
  template: `
    <section class="auth-shell">
      <div class="auth-card">
        <div class="auth-copy">
          <span class="eyebrow">Welcome back</span>
          <h1>Sign in to continue</h1>
          <p>Use your account to access protected areas.</p>
        </div>

        <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()">
          <app-form-input
            id="login-email"
            label="Email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            [control]="form.controls.email"
            [errorMessages]="emailErrors"
          />

          <app-form-input
            id="login-password"
            label="Password"
            type="password"
            autocomplete="current-password"
            placeholder="Enter your password"
            [control]="form.controls.password"
            [errorMessages]="passwordErrors"
          />

          @if (successMessage) {
            <p class="banner success-banner">{{ successMessage }}</p>
          }

          @if (errorMessage) {
            <p class="banner error-banner">{{ errorMessage }}</p>
          }

          <button class="primary-btn" type="submit" [disabled]="isSubmitting">
            {{ isSubmitting ? 'Signing in...' : 'Login' }}
          </button>
        </form>

        <div class="auth-links">
          <a routerLink="/forgot-password">Forgot password?</a>
          <p>New here? <a routerLink="/register">Create an account</a></p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .auth-shell { min-height: 100vh; display: grid; place-items: center; padding: 2rem 1rem; }
    .auth-card { width: min(100%, 28rem); background: rgba(255,255,255,0.94); border: 1px solid rgba(148,163,184,0.2); border-radius: 1.5rem; padding: 2rem; box-shadow: 0 24px 50px rgba(15,23,42,0.08); }
    .auth-copy { margin-bottom: 1.5rem; }
    .eyebrow { display: inline-block; margin-bottom: 0.75rem; color: #2563eb; font-weight: 700; font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; }
    h1 { margin: 0 0 0.5rem; font-size: 1.85rem; color: #0f172a; }
    p { margin: 0; color: #475569; }
    .auth-form { display: grid; gap: 1rem; }
    .banner { margin: 0; border-radius: 0.85rem; padding: 0.85rem 1rem; font-size: 0.9rem; }
    .success-banner { background: #ecfdf3; color: #027a48; }
    .error-banner { background: #fef3f2; color: #b42318; }
    .primary-btn { border: 0; border-radius: 0.9rem; padding: 0.95rem 1.15rem; background: linear-gradient(135deg, #1d4ed8, #0f766e); color: #fff; font-size: 1rem; font-weight: 700; cursor: pointer; }
    .primary-btn:disabled { opacity: 0.7; cursor: wait; }
    .auth-links { margin-top: 1rem; display: grid; gap: 0.6rem; font-size: 0.95rem; }
    a { color: #1d4ed8; text-decoration: none; font-weight: 600; }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly emailErrors = { required: 'Email is required.', email: 'Enter a valid email address.' };
  readonly passwordErrors = { required: 'Password is required.' };
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  isSubmitting = false;
  errorMessage = '';
  successMessage = this.route.snapshot.queryParamMap.get('reset') === 'success'
    ? 'Password reset successful. Please sign in.'
    : '';

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.authService.login(this.form.getRawValue()).pipe(
      finalize(() => (this.isSubmitting = false))
    ).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
        void this.router.navigateByUrl(returnUrl);
      },
      error: (error) => {
        this.errorMessage = error.error?.message ?? 'Unable to sign in. Please try again.';
      }
    });
  }
}
