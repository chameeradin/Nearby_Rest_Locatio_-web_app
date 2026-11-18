# Security Specification — Nearby Rest Locations

## 1. Data Invariants
1. **Strict Ownership**: Users can only read/write their own `/users/{userId}` profile, `/bookings/{bookingId}`, and `/searchHistory/{historyId}` documents.
2. **No Self-Privilege Escalation**: Non-admin users cannot create a profile with `role: 'admin'` or `status: 'suspended'`, nor update `role`, `status`, `uid`, or `createdAt`.
3. **Verified Email Enforcement**: All client writes require `request.auth.token.email_verified == true`.
4. **Admin Isolation**: Only verified admins (`chameeragamage2020@gmail.com` or an existing `/admins/{uid}` marker) can list all users, read `/activityLogs`, or manage `/promotions`.
5. **Terminal State Locking**: Cancelled or completed bookings cannot be mutated by standard users.
6. **Immutable Audit Logs**: `/activityLogs` cannot be updated or deleted by any client.

## 2. Dirty Dozen Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. Unauthenticated read of `/users/user1`
2. Unverified email user creating `/users/user1`
3. User creating `/users/user1` with `role: "admin"` (privilege escalation)
4. User updating own `/users/user1` to set `role: "admin"`
5. User A reading User B's `/users/userB` PII document
6. User A listing `/users` collection to scrape emails
7. User A creating a booking with `userId: "userB"` (identity spoofing)
8. User A inserting a shadow key `isFree: true` on `/bookings/b1`
9. User A updating a `cancelled` booking back to `confirmed` (terminal state bypass)
10. User A listing `/bookings` without filtering to `userId == request.auth.uid`
11. User A injecting a 2KB junk string into `placeName` or `id` (resource exhaustion)
12. Non-admin reading or deleting `/activityLogs` or creating `/promotions`
