import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface AdminUserTreeNodeViewModel {
  kind: 'user';
  id: string;
  name: string;
  balance: number;
  level: number;
  hasChildren: boolean;
  treeLevel: number;
  isExpanded: boolean;
  isLoadingChildren: boolean;
  childrenError: string | null;
  totalChildren: number;
  hasNextPage: boolean;
  parentId: string | null;
}

@Component({
  selector: 'app-admin-user-tree-node',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './admin-user-tree-node.component.html',
  styleUrl: './admin-user-tree-node.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUserTreeNodeComponent {
  @Input({ required: true }) id!: string;
  @Input({ required: true }) node!: AdminUserTreeNodeViewModel;
  @Output() toggleNode = new EventEmitter<void>();
  @Output() transferBalance = new EventEmitter<void>();
  @Output() retryLoad = new EventEmitter<void>();

  get childCountLabel(): string {
    if (!this.node.hasChildren && this.node.totalChildren === 0) {
      return 'No direct children';
    }

    if (this.node.totalChildren > 0) {
      return `${this.node.totalChildren} direct ${this.node.totalChildren === 1 ? 'child' : 'children'}`;
    }

    return this.node.hasChildren ? 'Children available' : 'No direct children';
  }
}
