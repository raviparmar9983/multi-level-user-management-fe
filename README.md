# MultiLevelUserManagement

This is an Angular application for multi-level user management with admin hierarchy and transfer workflows.

## Prerequisites

- Node.js 18+ installed
- npm 10+ installed
- A backend API running at `http://localhost:3000` or the URL configured in `src/environments/environment.ts`

## Setup and run

1. Open a terminal in the project folder:
   ```bash
   cd "c:\\Users\\ranjan go\\Desktop\\New folder (2)\\multi-level-user-management\\multi-level-user-management"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open the app in your browser:
   ```
   http://localhost:4200/
   ```

## If the backend API is not running

- Ensure the API is available at `http://localhost:3000`
- If the backend uses a different host or port, update `src/environments/environment.ts` and `src/environments/environment.development.ts`

## Common commands

- `npm start` - start the Angular development server
- `npm run build` - build the app for production
- `npm test` - run unit tests
- `npm run lint` - run linter (if configured)

## Notes

- The app uses Angular standalone components and Material styling.
- User authentication depends on the login API returning `accessToken`, `refreshToken`, and `user` information.
- If you change environment settings, restart the dev server.
