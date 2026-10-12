# Test Credentials (Sanitized)

## Auth Roles & Permissions Matrix
- `admin@example.com` → **admin** (Yönetici)
- `yonetici@example.com` → **admin** (Yönetici)
- `muhasebe@example.com` → **muhasebe** (Muhasebe)

All other unauthorized emails are rejected at `/api/auth/session` with **403** and shown an error on the login screen.

## Roles & Permissions
| Action | admin | muhasebe | ogretmen |
|---|---|---|---|
| View dashboard/students/documents | ✅ | ✅ | ✅ |
| Add student | ✅ | ✅ | ❌ |
| Add payment / expense | ✅ | ✅ | ❌ |
| Create class | ✅ | ❌ | ❌ |
| View / manage users | ✅ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ |
| Delete student / records | ✅ | ❌ | ❌ |
| Classes page visible | ✅ | ❌ | ✅ |
| Payments page visible | ✅ | ✅ | ❌ |

## Local Test Session (automated testing only)
- **user_id**: `test-user-inegol`
- **email**: `test-admin@example.com`
- **name**: `Test Yönetici`
- **role**: `admin`
- **session_token**: `test_session_inegol_123`

### Test different roles:
Change the role field on the user to test each: `admin`, `muhasebe`, `ogretmen`.

### How to use:
- **Backend curl**: `-H "Authorization: Bearer test_session_inegol_123"`
- **Browser**: set cookie `session_token=test_session_inegol_123` (httpOnly, secure, sameSite=None, path=/)
