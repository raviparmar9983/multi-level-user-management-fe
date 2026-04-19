import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTreeModule } from '@angular/material/tree';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs';
import { UserService, UserChildrenResponse, UserTreeApiNode } from '../users/services/user.service';
import { TransferBalanceDialogComponent } from '../users/components/tree/transfer-balance-dialog.component';
import { UserTreeNodeComponent, UserTreeNodeViewModel } from '../users/components/node/user-tree-node.component';

interface UserTreeNodeState extends UserTreeNodeViewModel {
  parentId: string | null;
}

interface LoadMoreTreeNode {
  kind: 'load-more';
  id: string;
  parentId: string;
  treeLevel: number;
  nextPage: number;
}

type TreeItem = UserTreeNodeState | LoadMoreTreeNode;

interface ChildrenState {
  items: UserTreeNodeState[];
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  isLoading: boolean;
  loaded: boolean;
  error: string | null;
}

@Component({
  selector: 'app-admin-user-hierarchy',
  standalone: true,
  imports: [CommonModule, MatTreeModule, MatCardModule, MatButtonModule, MatDialogModule, MatProgressSpinnerModule, MatSnackBarModule, UserTreeNodeComponent],
  templateUrl: './admin-user-hierarchy.component.html',
  styles: [
    ".hierarchy-shell { margin-top: 1rem; }",
    ".hierarchy-stage { display: grid; gap: 1rem; }",
    ".page-state { text-align: center; margin-top: 2rem; }",
    ".load-more-row { padding: 0.5rem 0; display: flex; justify-content: center; }"
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUserHierarchyComponent implements OnInit, OnDestroy {
  @Input({ required: true }) userId!: string;
  @Input() userName?: string;

  private readonly userService = inject(UserService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  private readonly expandedNodeIds = new Set<string>();
  private readonly childrenStateByParentId = new Map<string, ChildrenState>();
  private readonly pageSize = 10;

  readonly treeControl = new FlatTreeControl<TreeItem>(
    (node) => node.treeLevel,
    (node) => this.isUserNode(0, node) && node.hasChildren
  );

  visibleNodes: TreeItem[] = [];
  rootNode: UserTreeNodeState | null = null;
  isPageLoading = true;
  pageError = '';

  readonly isUserNode = (_: number, node: TreeItem): node is UserTreeNodeState => node.kind === 'user';
  readonly isLoadMoreNode = (_: number, node: TreeItem): node is LoadMoreTreeNode => node.kind === 'load-more';
  readonly trackByTreeItem = (_: number, item: TreeItem): string => item.id;

  ngOnInit(): void {
    this.rootNode = {
      kind: 'user',
      id: this.userId,
      parentId: null,
      name: this.userName ?? 'Selected user',
      balance: 0,
      level: 0,
      hasChildren: true,
      treeLevel: 0,
      isExpanded: false,
      isLoadingChildren: false,
      childrenError: null,
      totalChildren: 0,
      hasNextPage: false,
      isRootNode: true
    };

    this.expandedNodeIds.add(this.userId);
    this.expandNode(this.rootNode);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  retryPage(): void {
    this.isPageLoading = true;
    this.pageError = '';
    if (this.rootNode) {
      this.expandNode(this.rootNode);
    }
  }

  toggleNode(node: UserTreeNodeState): void {
    if (!node.hasChildren && !node.isExpanded) {
      return;
    }

    if (this.expandedNodeIds.has(node.id)) {
      this.expandedNodeIds.delete(node.id);
      this.rebuildVisibleTree();
      return;
    }

    this.expandNode(node);
  }

  retryNode(node: UserTreeNodeState): void {
    this.fetchChildren(node.id, 1, true);
  }

  loadMore(node: LoadMoreTreeNode): void {
    this.fetchChildren(node.parentId, node.nextPage, false);
  }

  openTransferBalanceDialog(node: UserTreeNodeState): void {
    const dialogRef = this.dialog.open(TransferBalanceDialogComponent, {
      width: '28rem',
      maxWidth: 'calc(100vw - 2rem)',
      data: {
        userId: node.id,
        userName: node.name
      }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((completed) => {
      if (!completed) {
        return;
      }

      this.snackBar.open(`Balance transferred to ${node.name}.`, 'Close', {
        duration: 2400
      });
      this.isPageLoading = true;
      if (this.rootNode) {
        this.expandNode(this.rootNode);
      }
    });
  }

  private expandNode(node: UserTreeNodeState): void {
    this.expandedNodeIds.add(node.id);
    const state = this.childrenStateByParentId.get(node.id);

    if (!state?.loaded) {
      this.fetchChildren(node.id, 1, true);
      return;
    }

    this.rebuildVisibleTree();
    this.expandRememberedDescendants(node.id);
  }

  private fetchChildren(parentId: string, page: number, reset: boolean): void {
    const currentState = this.childrenStateByParentId.get(parentId) ?? {
      items: [],
      page: 0,
      limit: this.pageSize,
      total: 0,
      hasNext: false,
      isLoading: false,
      loaded: false,
      error: null
    };

    this.childrenStateByParentId.set(parentId, {
      ...currentState,
      items: reset ? [] : currentState.items,
      isLoading: true,
      error: null
    });
    this.rebuildVisibleTree();

    this.userService.getChildren(parentId, page, this.pageSize).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => this.applyChildrenResponse(parentId, response, reset),
      error: (error) => {
        const failedState = this.childrenStateByParentId.get(parentId);

        if (failedState) {
          this.childrenStateByParentId.set(parentId, {
            ...failedState,
            isLoading: false,
            error: error.error?.message ?? 'Unable to load children for this user.'
          });
        }

        this.rebuildVisibleTree();
      }
    });
  }

  private applyChildrenResponse(parentId: string, response: UserChildrenResponse, reset: boolean): void {
    const previousItems = reset ? [] : (this.childrenStateByParentId.get(parentId)?.items ?? []);
    const items = [
      ...previousItems,
      ...response.data.map((node) => this.toTreeNodeState(node, parentId))
    ];

    this.childrenStateByParentId.set(parentId, {
      items,
      page: response.pagination.page,
      limit: response.pagination.limit,
      total: response.pagination.total,
      hasNext: response.pagination.hasNext,
      isLoading: false,
      loaded: true,
      error: null
    });

    if (this.rootNode && parentId === this.rootNode.id) {
      this.rootNode = {
        ...this.rootNode,
        hasChildren: response.pagination.total > 0,
        totalChildren: response.pagination.total,
        hasNextPage: response.pagination.hasNext
      };
    }

    this.rebuildVisibleTree();
    this.expandRememberedDescendants(parentId);
  }

  private toTreeNodeState(node: UserTreeApiNode, parentId: string): UserTreeNodeState {
    const cachedState = this.childrenStateByParentId.get(node._id);

    return {
      kind: 'user',
      id: node._id,
      parentId,
      name: node.name,
      balance: node.balance,
      level: node.level,
      hasChildren: node.hasChildren,
      treeLevel: this.resolveTreeLevel(parentId) + 1,
      isExpanded: this.expandedNodeIds.has(node._id),
      isLoadingChildren: cachedState?.isLoading ?? false,
      childrenError: cachedState?.error ?? null,
      totalChildren: cachedState?.total ?? 0,
      hasNextPage: cachedState?.hasNext ?? false,
      isRootNode: false
    };
  }

  private rebuildVisibleTree(): void {
    if (!this.rootNode) {
      this.visibleNodes = [];
      this.treeControl.dataNodes = [];
      this.cdr.markForCheck();
      return;
    }

    const rootChildrenState = this.childrenStateByParentId.get(this.rootNode.id);
    const rootIsExpanded = this.expandedNodeIds.has(this.rootNode.id);

    this.rootNode = {
      ...this.rootNode,
      isExpanded: rootIsExpanded,
      isLoadingChildren: rootChildrenState?.isLoading ?? false,
      childrenError: rootChildrenState?.error ?? null,
      totalChildren: rootChildrenState?.total ?? this.rootNode.totalChildren,
      hasNextPage: rootChildrenState?.hasNext ?? false
    };

    const builtNodes: TreeItem[] = [this.rootNode];

    if (rootIsExpanded) {
      this.appendVisibleChildren(this.rootNode.id, builtNodes);
    }

    this.visibleNodes = builtNodes;
    this.treeControl.dataNodes = builtNodes;
    this.cdr.markForCheck();
  }

  private appendVisibleChildren(parentId: string, target: TreeItem[]): void {
    const state = this.childrenStateByParentId.get(parentId);

    if (!state) {
      return;
    }

    for (const item of state.items) {
      const refreshedItem = this.toTreeNodeState(
        {
          _id: item.id,
          name: item.name,
          balance: item.balance,
          level: item.level,
          hasChildren: item.hasChildren
        },
        item.parentId ?? parentId
      );

      target.push(refreshedItem);

      if (this.expandedNodeIds.has(refreshedItem.id)) {
        this.appendVisibleChildren(refreshedItem.id, target);
      }
    }

    if (state.hasNext) {
      target.push({
        kind: 'load-more',
        id: `load-more-${parentId}-${state.page + 1}`,
        parentId,
        treeLevel: this.resolveTreeLevel(parentId) + 1,
        nextPage: state.page + 1
      });
    }
  }

  private expandRememberedDescendants(parentId: string): void {
    const state = this.childrenStateByParentId.get(parentId);

    if (!state) {
      return;
    }

    for (const child of state.items) {
      if (this.expandedNodeIds.has(child.id) && child.hasChildren) {
        const childState = this.childrenStateByParentId.get(child.id);

        if (!childState?.loaded) {
          this.fetchChildren(child.id, 1, true);
        }
      }
    }
  }

  private resolveTreeLevel(parentId: string): number {
    if (this.rootNode?.id === parentId) {
      return this.rootNode.treeLevel;
    }

    for (const state of this.childrenStateByParentId.values()) {
      const found = state.items.find((item) => item.id === parentId);

      if (found) {
        return found.treeLevel;
      }
    }

    return 0;
  }
}
