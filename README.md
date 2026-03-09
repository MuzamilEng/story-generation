# Purposify - Authentication Setup Guide

A Next.js application with NextAuth.js authentication and Prisma ORM integration with PostgreSQL.

## 🚀 Features

- **Authentication**: Sign up, sign in, and sign out functionality
- **Role-Based Access Control**: User, Moderator, and Admin roles with specific permissions
- **Database**: PostgreSQL with Prisma ORM
- **UI**: Modern UI with shadcn/ui components
- **Security**: Password hashing, JWT tokens, protected routes
- **Admin Panel**: User management and system administration

## 📋 Prerequisites

- Node.js 20.x or later
- PostgreSQL database
- npm or yarn package manager

## 🛠️ Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/purposify_db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-here-change-in-production"

# Optional: OAuth Providers
# GOOGLE_CLIENT_ID=""
# GOOGLE_CLIENT_SECRET=""
# GITHUB_CLIENT_ID=""
# GITHUB_CLIENT_SECRET=""
```

**Important**: Replace the placeholder values with your actual database credentials and generate a secure NEXTAUTH_SECRET.

### 2. Database Setup

1. **Create PostgreSQL Database**:
   ```sql
   CREATE DATABASE purposify_db;
   CREATE USER purposify_user WITH ENCRYPTED PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE purposify_db TO purposify_user;
   ```

2. **Run Database Migrations**:
   ```bash
   # Make sure your .env.local is configured first
   ./setup-db.sh
   ```

   Or run manually:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your application.

## 👥 User Roles & Permissions

### Roles
- **User**: Basic user with access to dashboard and content management
- **Moderator**: Enhanced user with analytics access and content deletion permissions
- **Admin**: Full system access including user management and admin panel

### Permissions by Role
| Permission | User | Moderator | Admin |
|------------|------|-----------|-------|
| View Dashboard | ✅ | ✅ | ✅ |
| Manage Content | ✅ | ✅ | ✅ |
| View Analytics | ❌ | ✅ | ✅ |
| Delete Content | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ✅ |
| Access Admin Panel | ❌ | ❌ | ✅ |
| Manage Settings | ❌ | ❌ | ✅ |

## 🔐 Authentication Flow

1. **Sign Up**: Users can create accounts at `/auth/signup` (default role: User)
2. **Sign In**: Users authenticate at `/auth/signin`
3. **Role-Based Access**: Different features available based on user role
4. **Protected Routes**: Dashboard and admin routes protected by middleware
5. **Sign Out**: Available from the user menu in the header

## 🗂️ Project Structure

```
src/
├── app/
│   ├── admin/                     # Admin panel (Admin only)
│   │   ├── users/                 # User management
│   │   └── page.tsx               # Admin dashboard
│   ├── api/
│   │   ├── admin/                 # Admin API routes
│   │   ├── auth/[...nextauth]/    # NextAuth API routes
│   │   └── auth/signup/           # User registration API
│   ├── auth/                      # Authentication pages
│   ├── components/
│   │   ├── dashboard-components/  # Dashboard UI
│   │   ├── providers.tsx          # Session provider
│   │   └── ui/                    # shadcn/ui components
│   ├── hooks/
│   │   └── use-role.ts            # Role management hooks
│   ├── lib/
│   │   ├── auth.ts                # NextAuth configuration
│   │   ├── prisma.ts              # Prisma client
│   │   ├── roles.ts               # Role definitions
│   │   └── role-middleware.ts     # Role-based middleware
│   ├── middleware.ts              # Route protection
│   └── unauthorized/              # Access denied page
prisma/
├── schema.prisma                  # Database schema
└── migrations/                    # Database migrations
```

## 🛡️ Security Features

- Password hashing with bcrypt
- JWT-based sessions
- Protected API routes
- CSRF protection via NextAuth
- SQL injection prevention via Prisma
- Role-based access control (RBAC)
- Admin-only API endpoints and routes

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Database Management

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# View database
npx prisma studio

# Reset database
npx prisma migrate reset
```

## 🚀 Deployment

1. Set production environment variables
2. Run `npm run build`
3. Deploy to your hosting platform
4. Run database migrations on production

## 📝 Notes

- The middleware protects all routes except authentication pages
- User sessions are managed automatically by NextAuth
- Database schema includes all NextAuth required tables
- Passwords are hashed before storage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

Happy coding! 🎉