import { AdminUserDetailComponent } from './pages/admin-user-detail.component';
import { Routes } from '@angular/router';
import { authGuard } from './auth/guards/auth.guard';
import { roleGuard } from './auth/guards/role.guard';
import { ForgotPasswordComponent } from './auth/pages/forgot-password.component';
import { LoginComponent } from './auth/pages/login.component';
import { RegisterComponent } from './auth/pages/register.component';
import { ResetPasswordComponent } from './auth/pages/reset-password.component';
import { VerifyEmailComponent } from './auth/pages/verify-email.component';
import { DashboardComponent } from './pages/dashboard.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'email-verified', component: VerifyEmailComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  {
    path: 'users',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./users/components/tree/users-tree.component').then((module) => module.UsersTreeComponent)
  },
  {
    path: 'admin/user/:id',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    component: AdminUserDetailComponent
  },
  { path: '**', redirectTo: 'login' }
];
