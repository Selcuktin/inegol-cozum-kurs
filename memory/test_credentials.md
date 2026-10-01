# Test Credentials

## Emergent Google Auth + Email Allowlist
Only these emails can sign in (case-insensitive):
- `kayrasemihseymen@gmail.com` → **admin** (Yönetici)
- `inegolcozumkurs@gmail.com` → **admin** (Yönetici)
- `info@inegolcozumkurs.com` → **muhasebe** (Muhasebe)

All other emails are rejected at `/api/auth/session` with **403** and shown an error on the login screen.

## Roles & Permissions
| Action | admin | muhasebe | ogretmen |
|---|---|---|---|
| View dashboard/students/documents | ✅ | ✅ | ✅ |
| Add student | ✅ | ❌ | ❌ |
| Add payment / expense | ✅ | ✅ | ❌ |
| Create class | ✅ | ❌ | ❌ |
| View / manage users | ✅ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ |
| Classes page visible | ✅ | ❌ | ✅ |
| Payments page visible | ✅ | ✅ | ❌ |

## Local Test Session (automated testing only)
- **user_id**: `test-user-inegol`
- **email**: `kayrasemihseymen@gmail.com`
- **name**: `Kayra Semih Seymen`
- **role**: `admin`
- **session_token**: `test_session_inegol_123`

### Recreate:
```
mongosh --quiet --eval "
use('test_database');
db.users.deleteMany({user_id: 'test-user-inegol'});
db.user_sessions.deleteMany({session_token: 'test_session_inegol_123'});
db.users.insertOne({user_id: 'test-user-inegol', email: 'kayrasemihseymen@gmail.com', name: 'Kayra Semih Seymen', picture: '', role: 'admin', created_at: new Date()});
db.user_sessions.insertOne({user_id: 'test-user-inegol', session_token: 'test_session_inegol_123', expires_at: new Date(Date.now() + 7*24*60*60*1000), created_at: new Date()});
"
```

### Test different roles:
Change the role field on the user to test each: `admin`, `muhasebe`, `ogretmen`.

### How to use:
- **Backend curl**: `-H "Authorization: Bearer test_session_inegol_123"`
- **Browser**: set cookie `session_token=test_session_inegol_123` (httpOnly, secure, sameSite=None, path=/)
