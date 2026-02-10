# Database Migrations

Reorganized migration structure for easy database initialization and debugging.

## Migration Files (Execute in Order)

| File | Description | Tables Included |
|------|-------------|-----------------|
| **01_core_auth_users.sql** | Authentication & User Management | `users`, `login_otps` |
| **02_reference_data.sql** | Geographic Reference Data | `ref_provinces`, `ref_cities` |
| **03_pricing_credits_assets.sql** | Business Logic & User Assets | `pricing_packages`, `credit_packages`, `user_assets` |
| **04_albums_base.sql** | Core Album System | `albums`, `album_members`, `album_invites` |
| **05_yearbook_classes_access.sql** | Yearbook Classes & Student Access | `album_classes`, `album_class_access` |
| **06_album_teachers.sql** | Teacher Management | `album_teachers`, `album_teacher_photos` |
| **07_album_join_requests.sql** | Universal Registration System | `album_join_requests` |
| **08_storage_buckets.sql** | File Storage Configuration | Storage: `user_files`, `album-photos` |
| **09_realtime_setup.sql** | Real-time Subscriptions | Realtime: 6 tables configured |

## Total Database Objects

- **15 Tables**: All production tables included
- **2 Storage Buckets**: user_files (10MB limit), album-photos (20MB limit)
- **6 Realtime Publications**: For live updates across the app
- **Helper Functions**: Owner checks, capacity checks, stats calculations
- **RLS Policies**: Complete row-level security on all tables

## How to Use

### Fresh Database Setup (New Device)

1. Create new Supabase project or reset existing database
2. Open **Supabase Dashboard → SQL Editor**
3. Execute migrations **in order** (01 through 09):
   ```
   01_core_auth_users.sql
   02_reference_data.sql
   03_pricing_credits_assets.sql
   04_albums_base.sql
   05_yearbook_classes_access.sql
   06_album_teachers.sql
   07_album_join_requests.sql
   08_storage_buckets.sql
   09_realtime_setup.sql
   ```
4. Verify all tables created: Check **Database → Tables** (should see 15 tables)
5. Seed city data: Run `scripts/seed_ref_cities.mjs` (489 cities)

### Troubleshooting

**Problem**: "Table already exists" error  
**Solution**: Migrations are idempotent - safe to re-run. Uses `IF NOT EXISTS` and `ON CONFLICT` clauses.

**Problem**: "Function already exists" error  
**Solution**: Migrations use `CREATE OR REPLACE FUNCTION` - safe to re-run.

**Problem**: Missing tables after migration  
**Solution**: Check you ran all 9 files in order. Verify no SQL errors in terminal.

**Problem**: RLS blocking queries  
**Solution**: Check user authentication. Some policies require album ownership or approved access.

**Problem**: Storage upload fails  
**Solution**: Verify file type in allowed list. Check file size limits (user_files: 10MB, album-photos: 20MB).

## Feature Debugging

If you encounter issues with specific features:

- **Authentication issues** → Check `01_core_auth_users.sql`
- **Location dropdowns** → Check `02_reference_data.sql` + seed script
- **Credit system** → Check `03_pricing_credits_assets.sql`
- **Album creation/access** → Check `04_albums_base.sql`
- **Yearbook classes** → Check `05_yearbook_classes_access.sql`
- **Teacher management** → Check `06_album_teachers.sql`
- **Registration flow** → Check `07_album_join_requests.sql`
- **File uploads** → Check `08_storage_buckets.sql`
- **Live updates** → Check `09_realtime_setup.sql`

## Architecture Notes

### Data Flow: Registration Approval

```
User submits registration
  ↓
album_join_requests (status: 'pending')
  ↓
Admin approves
  ↓
INSERT → album_class_access (permanent storage)
  ↓
DELETE → album_join_requests (cleanup)
```

### Permission Hierarchy

1. **Album Owner** (`albums.user_id`)
2. **Album Admin/Helper** (`album_members` with role)
3. **Approved Student** (`album_class_access` with approved status)
4. **Global Admin** (via `check_is_global_admin()` function)

### Important Tables

- **album_members**: NOT for students - only for album admins/helpers
- **album_class_access**: Permanent storage for approved students
- **album_join_requests**: Temporary - only pending/rejected requests

## Migration History

**Old Structure**: 21 fragmented files organized chronologically  
**New Structure**: 9 modular files organized by feature  
**Migration Date**: 2024

These migrations replace the original `/migrations/` folder with a cleaner, more maintainable structure optimized for fresh database initialization and feature-based debugging.
