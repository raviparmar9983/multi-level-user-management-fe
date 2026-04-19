import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminUserTreeComponent } from './admin-user-tree.component';

@Component({
  selector: 'app-admin-user-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminUserTreeComponent],
  templateUrl: './admin-user-detail.component.html',
  styles: [
    ".admin-user-detail { padding: 1rem; }",
    ".detail-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }",
    ".detail-header h1 { margin: 0; }",
    ".user-meta { display: grid; gap: 0.5rem; }",
    ".selected-user-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.75rem; border-radius: 999px; background: rgba(0,0,0,.05); font-size: 0.95rem; }"
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUserDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  selectedUserId: string | null = null;
  selectedUserName: string | undefined;

  ngOnInit(): void {
    this.selectedUserId = this.route.snapshot.paramMap.get('id');
    const navigation = this.router.getCurrentNavigation();
    this.selectedUserName = navigation?.extras.state?.['userName'];

    if (!this.selectedUserId) {
      this.router.navigate(['/dashboard']);
    }
  }
}
