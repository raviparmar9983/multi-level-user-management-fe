import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    ViewChild,
    inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';
import { UserService, UserTreeApiNode } from '../users/services/user.service';

@Component({
    selector: 'app-admin-users-list',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        MatButtonModule,
        MatCardModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './admin-users-list.component.html',
    styleUrl: './admin-users-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminUsersListComponent
    implements OnInit, AfterViewInit, OnDestroy {

    private readonly userService = inject(UserService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly destroy$ = new Subject<void>();

    @ViewChild('scrollAnchor') scrollAnchor!: ElementRef;

    private observer!: IntersectionObserver;

    users: UserTreeApiNode[] = [];

    page = 1;
    limit = 10;
    hasNext = false;

    isLoading = false;
    isLoadingMore = false;
    error = '';

    ngOnInit(): void {
        this.loadUsers(1);
    }

    ngAfterViewInit(): void {
        this.setupScrollObserver();
    }

    ngOnDestroy(): void {
        this.observer?.disconnect();
        this.destroy$.next();
        this.destroy$.complete();
    }

    private loadUsers(page: number): void {
        this.error = '';

        if (page === 1) {
            this.isLoading = true;
            this.users = [];
        } else {
            this.isLoadingMore = true;
        }

        this.userService.getAdminUsers(page, this.limit)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    const newUsers = res.users || res.data || [];

                    this.users = page === 1
                        ? newUsers
                        : [...this.users, ...newUsers];

                    this.page = res.pagination?.page || page;
                    this.hasNext = res.pagination?.hasNext || false;

                    this.isLoading = false;
                    this.isLoadingMore = false;

                    this.cdr.markForCheck();
                },
                error: (err) => {
                    console.error(err);

                    this.error = err?.error?.message || 'Failed to load users';
                    this.isLoading = false;
                    this.isLoadingMore = false;
                    this.hasNext = false;

                    this.cdr.markForCheck();
                }
            });
    }

    private setupScrollObserver(): void {
        this.observer = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting) {
                this.loadNextPage();
            }
        }, {
            rootMargin: '200px'
        });

        if (this.scrollAnchor) {
            this.observer.observe(this.scrollAnchor.nativeElement);
        }
    }

    private loadNextPage(): void {
        if (this.isLoading || this.isLoadingMore || !this.hasNext) return;
        this.loadUsers(this.page + 1);
    }


    retry(): void {
        this.loadUsers(1);
    }

    trackByUserId(index: number, user: UserTreeApiNode): string {
        return user._id;
    }
}