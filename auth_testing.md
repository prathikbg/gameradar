Auth-Gated App Testing (Emergent Google Auth)
1. Create test user/session via mongosh in DB test_database: insert into `users` {user_id, email, name, picture, created_at} and `user_sessions` {user_id, session_token, expires_at (now+7d), created_at}.
2. Backend: curl -H "Authorization: Bearer <token>" $URL/api/auth/me ; /api/wishlist (GET/POST/DELETE).
3. Browser: add cookie session_token (httpOnly, secure, sameSite None, path /) on app domain then visit /wishlist.
Checks: users have user_id; queries exclude _id; /api/auth/me returns user.
