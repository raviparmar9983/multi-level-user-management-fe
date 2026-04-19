import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-input.component.html',
  styleUrl: './form-input.component.scss'
})
export class FormInputComponent {
  @Input({ required: true }) id!: string;
  @Input({ required: true }) label!: string;
  @Input({ required: true }) control!: FormControl;
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() autocomplete = 'off';
  @Input() errorMessages: Record<string, string> = {};

  get showError(): boolean {
    return this.control.invalid && (this.control.touched || this.control.dirty);
  }

  get firstError(): string {
    const errors = this.control.errors;
    if (!errors) {
      return '';
    }

    const key = Object.keys(errors)[0];
    return this.errorMessages[key] ?? 'This field is invalid.';
  }
}
