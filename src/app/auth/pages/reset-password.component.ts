import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { FormInputComponent } from '../components/form-input.component';
import { AuthService } from '../services/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormInputComponent],
  template: `
    <section class="auth-shell">
      <div class="auth-card">
        <div class="auth-copy">
          <span class="eyebrow">Choose a new password</span>
          <h1>Reset password</h1>
          <p>Set a new password for your account and sign back in securely.</p>
        </div>

        @if (!token) {
          <p class="banner error-banner">Reset token is missing. Please use the link from your email.</p>
        } @else {
          <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()">
            <app-form-input id="reset-password" label="Password" type="password" autocomplete="new-password" placeholder="Enter a new password" [control]="form.controls.password" [errorMessages]="passwordErrors" />
            <app-form-input id="reset-confirm-password" label="Confirm password" type="password" autocomplete="new-password" placeholder="Repeat your password" [control]="form.controls.confirmPassword" [errorMessages]="confirmPasswordErrors" />

            @if (form.hasError('passwordMismatch') && (form.controls.confirmPassword.touched || form.controls.confirmPassword.dirty)) {
              <p class="banner error-banner">Passwords do not match.</p>
            }

            @if (errorMessage) {
              <p class="banner error-banner">{{ errorMessage }}</p>
            }

            <button class="primary-btn" type="submit" [disabled]="isSubmitting">
              {{ isSubmitting ? 'Updating...' : 'Reset password' }}
            </button>
          </form>
        }

        <div class="auth-links">
          <p>Back to <a routerLink="/login">login</a></p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .auth-shell { min-height: 100vh; display: grid; place-items: center; padding: 2rem 1rem; }
    .auth-card { width: min(100%, 28rem); background: rgba(255,255,255,0.94); border: 1px solid rgba(148,163,184,0.2); border-radius: 1.5rem; padding: 2rem; box-shadow: 0 24px 50px rgba(15,23,42,0.08); }
    .auth-copy { margin-bottom: 1.5rem; }
    .eyebrow { display: inline-block; margin-bottom: 0.75rem; color: #7c3aed; font-weight: 700; font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; }
    h1 { margin: 0 0 0.5rem; font-size: 1.85rem; color: #0f172a; }
    p { margin: 0; color: #475569; }
    .auth-form { display: grid; gap: 1rem; }
    .banner { margin: 0; border-radius: 0.85rem; padding: 0.85rem 1rem; font-size: 0.9rem; }
    .error-banner { background: #fef3f2; color: #b42318; }
    .primary-btn { border: 0; border-radius: 0.9rem; padding: 0.95rem 1.15rem; background: linear-gradient(135deg, #7c3aed, #2563eb); color: #fff; font-size: 1rem; font-weight: 700; cursor: pointer; }
    .primary-btn:disabled { opacity: 0.7; cursor: wait; }
    .auth-links { margin-top: 1rem; font-size: 0.95rem; }
    a { color: #1d4ed8; text-decoration: none; font-weight: 600; }
  `]
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly passwordErrors = { required: 'Password is required.', minlength: 'Password must be at least 6 characters.' };
  readonly confirmPasswordErrors = { required: 'Please confirm your password.' };
  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    },
    { validators: passwordMatchValidator }
  );

  readonly token = this.route.snapshot.queryParamMap.get('token');
  isSubmitting = false;
  errorMessage = '';

  submit(): void {
    if (!this.token) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.authService.resetPassword({
      token: this.token,
      password: this.form.controls.password.getRawValue()
    }).pipe(
      finalize(() => (this.isSubmitting = false))
    ).subscribe({
      next: () => {
        void this.router.navigate(['/login'], { queryParams: { reset: 'success' } });
      },
      error: (error) => {
        this.errorMessage = error.error?.message ?? 'Unable to reset password. Please try again.';
      }
    });
  }
}
