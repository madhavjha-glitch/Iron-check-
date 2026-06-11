# Firestore Security Specification

This document details the security model, access control policies, and negative test targets ("The Dirty Dozen Payloads") for the Gym Management application.

## 1. Domain Data Invariants & Access Control Matrix

| Collection | Document Path | Operational Action | Access Gate | Strict Constraints |
|---|---|---|---|---|
| `users` | `/users/{userId}` | `read` | Own User OR Admin | User can only read their own profile. Admin can read all profiles. |
| `users` | `/users/{userId}` | `create` | Own User OR Admin | `userId` matches `request.auth.uid`. Role must default to `customer` (preventing self-escalation) unless user is the bootstrapped Admin (`madhavjha514@gmail.com`). `joinedAt` must match `request.time`. |
| `users` | `/users/{userId}` | `update` | Own User OR Admin | Regular users can modify their profile meta, but CANNOT alter internal system fields (`role`, `joinedAt`, `membershipStatus`, `feeStatus`, `feeDueDate`). Admins can modify all fields. `updatedAt` matches `request.time`. |
| `attendance`| `/attendance/{attendanceId}` | `read` | Own Log OR Admin | Customers can only list or get check-in entries where `userId == request.auth.uid`. Admins can read all. |
| `attendance`| `/attendance/{attendanceId}` | `create` | Own Log OR Admin | `userId` in the payload must match `request.auth.uid`. `timestamp` must match `request.time`. `id` and `dateString` must be structurally sound strings. |
| `attendance`| `/attendance/{attendanceId}` | `update/delete`| Admin Only | Customers cannot edit or delete check-in logs. |
| `routines` | `/routines/{routineId}` | `read` | Signed In | All authenticated users (Admins and Customers) can read exercise plans. |
| `routines` | `/routines/{routineId}` | `write` | Admin Only | Only Gym Admins can create, update, or delete exercise routines. |
| `reminders` | `/reminders/{reminderId}` | `read` | Log Recipient OR Admin| Recipients can only see their own reminders (`userId == request.auth.uid`). Admins can read all. |
| `reminders` | `/reminders/{reminderId}` | `write` | Admin Only | Only Gym Admins (or system service) can create or update fee reminders. |

---

## 2. The "Dirty Dozen" Payloads (Exploit Vector Tests)

The following malicious payloads must be rejected by the security rules with a `PERMISSION_DENIED` status:

### Payload 1: Privilege Escalation on Creation
* **Description**: A new user attempts to sign up directly as an Admin.
* **Target Operation**: `create` on `/users/attackerUID`
* **Payload**:
  ```json
  {
    "uid": "attackerUID",
    "name": "Attacker",
    "email": "attacker@gmail.com",
    "role": "admin",
    "joinedAt": "2026-06-11T00:00:00Z",
    "membershipStatus": "active",
    "feeStatus": "paid",
    "feeDueDate": "2026-07-11T00:00:00Z"
  }
  ```
* **Reason for Denial**: Non-bootstrapped users cannot self-assign the `"admin"` role upon registration.

### Payload 2: Privilege Escalation on Update
* **Description**: An existing customer attempts to upgrade their role to `"admin"`.
* **Target Operation**: `update` on `/users/customerUID`
* **Payload**:
  ```json
  {
    "role": "admin"
  }
  ```
* **Reason for Denial**: Role state updates on a profile are restricted to authorized admins.

### Payload 3: Information Disclosure (Profile Scraping)
* **Description**: User A attempts to read User B's profile document.
* **Target Operation**: `get` on `/users/userB_UID` (when authenticated as User A)
* **Reason for Denial**: Access is restricted to either the owner of the document or an administrator.

### Payload 4: Fake Join-Date Spoofing
* **Description**: Attacker tries to register with a historic joined date to spoof loyalty status.
* **Target Operation**: `create` on `/users/attackerUID`
* **Payload**:
  ```json
  {
    "uid": "attackerUID",
    "name": "Attacker",
    "email": "attacker@gmail.com",
    "role": "customer",
    "joinedAt": "2020-01-01T00:00:00Z",
    "membershipStatus": "active",
    "feeStatus": "unpaid",
    "feeDueDate": "2026-07-11T00:00:00Z"
  }
  ```
* **Reason for Denial**: `joinedAt` must equal `request.time`.

### Payload 5: Lockout Fields Bypass (JoinedAt Modification)
* **Description**: User attempts to update their immutable join date field.
* **Target Operation**: `update` on `/users/customerUID`
* **Payload**:
  ```json
  {
    "joinedAt": "2020-01-01T00:00:00Z"
  }
  ```
* **Reason for Denial**: `joinedAt` is immutable for non-admin users.

### Payload 6: Attendance Fraud (Spoofing Check-in UID)
* **Description**: Attacker checks in on behalf of another member.
* **Target Operation**: `create` on `/attendance/attendanceLog123`
* **Payload**:
  ```json
  {
    "id": "attendanceLog123",
    "userId": "otherUserUID",
    "userName": "Victim Member",
    "timestamp": "request.time",
    "dateString": "2026-06-11"
  }
  ```
* **Reason for Denial**: `userId` field in the payload must match the checking-in user's authentic credential UID (`request.auth.uid`).

### Payload 7: Backdated/Future Timestamp Attendance Fraud
* **Description**: Attacker attempts to forge check-in timestamps to claim continuous attendance.
* **Target Operation**: `create` on `/attendance/attendanceLog123`
* **Payload**:
  ```json
  {
    "id": "attendanceLog123",
    "userId": "attackerUID",
    "userName": "Attacker",
    "timestamp": "2026-01-01T08:00:00Z",
    "dateString": "2026-01-01"
  }
  ```
* **Reason for Denial**: `timestamp` must be validated against `request.time`.

### Payload 8: Theft of Attendance Records
* **Description**: Customer attempts to read check-in history lists of other gym members.
* **Target Operation**: `list` on `/attendance` where `userId != request.auth.uid`
* **Reason for Denial**: Regular customers can only list their own log resources.

### Payload 9: Intercepting Private Reminders
* **Description**: Customer attempts to read a private reminder directed to another member.
* **Target Operation**: `get` on `/reminders/reminderB_ID`
* **Reason for Denial**: Personal reminders must check that `resource.data.userId == request.auth.uid`.

### Payload 10: Unauthorized Fee Alert Generation
* **Description**: Customer attempts to dispatch high-priority notifications to other gym users.
* **Target Operation**: `create` on `/reminders/fakeReminder`
* **Payload**:
  ```json
  {
    "id": "fakeReminder",
    "userId": "victimUID",
    "title": "Payment Overdue",
    "body": "Your membership is suspended. Pay immediately.",
    "sentAt": "request.time",
    "status": "unread"
  }
  ```
* **Reason for Denial**: Only Admins can write reminder records.

### Payload 11: Direct Exercise Routine Injection
* **Description**: Customer attempts to inject a new or modified routine into the gym library.
* **Target Operation**: `create` on `/routines/wednesday_arms`
* **Payload**:
  ```json
  {
    "id": "wednesday_arms",
    "day": "Wednesday",
    "title": "Malicious Routine",
    "exercises": "[]"
  }
  ```
* **Reason for Denial**: Routine modification is restricted entirely to authorized Admins.

### Payload 12: Account Deletion (Self-Mutilation / Account Sabotage)
* **Description**: Attacker attempts to delete another user's profile document.
* **Target Operation**: `delete` on `/users/victimUID`
* **Reason for Denial**: Only the user themselves OR an administrator can delete their user record (our rules will secure this to Admin-only or owner-only).

---

## 3. Test Runner Execution Details
The negative test conditions are integrated directly within our security rule validation structure and checked against client integrations during runtime.
