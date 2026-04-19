import { ChangeDetectionStrategy, Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UserService } from '../../services/user.service';

interface TransferDialogData {
  userId: string;
  userName: string;
  isAdminTransfer?: boolean;
}

@Component({
  selector: 'app-transfer-balance-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './transfer-balance-dialog.component.html',
  styleUrl: './transfer-balance-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransferBalanceDialogComponent {
  readonly dialogRef = inject(MatDialogRef<TransferBalanceDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);

  readonly form = this.fb.nonNullable.group({
    amount: [200, [Validators.required, Validators.min(1)]]
  });

  isSubmitting = false;
  errorMessage = '';

  constructor(@Inject(MAT_DIALOG_DATA) readonly data: TransferDialogData) { }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    const payload = {
      userId: this.data.userId,
      amount: this.form.getRawValue().amount
    };

    const transferObs = this.data.isAdminTransfer
      ? this.userService.transferBalanceAdmin(payload)
      : this.userService.transferBalance(payload);

    transferObs.pipe(
      finalize(() => {
        this.isSubmitting = false;
      })
    ).subscribe({
      next: () => {
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error.error?.message ?? 'Unable to transfer balance right now.';
      }
    });
  }
}
