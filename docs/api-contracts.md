# Venora API Contracts

## Purpose

This document defines the frontend-to-backend API contracts for the Venora platform. It describes the expected request data, response data, validation rules, errors, redirects, and frontend usage for each major feature.

Venora uses Supabase as the backend platform. The frontend communicates with:

- Supabase Auth
- Supabase PostgreSQL tables
- Supabase Storage
- Supabase Edge Functions
- Payment webhook endpoints
- AI Edge Functions

---

# 1. Standard API Response Format

All frontend service functions should follow one consistent response shape.

```ts
type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

type ApiResponse<T> = ApiSuccess<T> | ApiError;
```

## 1.1 Common Error Codes

| Code | Meaning |
|---|---|
| AUTH_REQUIRED | User must be logged in |
| FORBIDDEN | User does not have permission |
| VALIDATION_ERROR | Request contains invalid input |
| NOT_FOUND | Requested resource does not exist |
| SERVER_ERROR | Unexpected server error |

---

# 2. Authentication Contracts

## Overview

The authentication module handles user registration, login, logout, password recovery, email verification, profile management, and role-based access control.

Venora uses Supabase Auth for authentication and a user profile table for storing application-specific user data such as full name, role, avatar, phone number, and account status.

Supported roles:

```ts
type UserRole =
  | "customer"
  | "venue_owner"
  | "event_coordinator"
  | "supplier"
  | "admin";
```

Common user profile shape:

```ts
type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  phoneNumber?: string;
  isEmailVerified: boolean;
  accountStatus: "active" | "disabled" | "pending_verification";
  createdAt: string;
  updatedAt: string;
};
```

---

## 2.1 Register User

Used by:

```txt
/register
```

### Frontend Function

```ts
registerUser(input: RegisterUserInput): Promise<ApiResponse<RegisterUserResponse>>
```

### Request

```ts
type RegisterUserInput = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: "customer" | "venue_owner" | "event_coordinator" | "supplier";
};
```

### Validation Rules

| Field | Rule |
|---|---|
| fullName | Required, minimum 2 characters |
| email | Required, must be valid email |
| password | Required, minimum 8 characters |
| confirmPassword | Required, must match password |
| role | Required, must be one of the allowed public roles |

### Success Response

```ts
type RegisterUserResponse = {
  user: UserProfile;
  message: "Registration successful. Please verify your email.";
};
```

### Possible Errors

| Code | Message |
|---|---|
| AUTH_EMAIL_EXISTS | Email is already registered |
| AUTH_INVALID_EMAIL | Invalid email address |
| AUTH_WEAK_PASSWORD | Password must be at least 8 characters |
| AUTH_PASSWORD_MISMATCH | Passwords do not match |
| AUTH_INVALID_ROLE | Selected role is not allowed |
| AUTH_REGISTER_FAILED | Failed to register user |

### Frontend Behavior

- Show form validation before submitting.
- Disable the submit button while registering.
- On success, show a message telling the user to verify their email.
- Do not automatically redirect to protected pages until the user has a valid session and verified email.

---

## 2.2 Login User

Used by:

```txt
/login
```

### Frontend Function

```ts
loginUser(input: LoginUserInput): Promise<ApiResponse<LoginUserResponse>>
```

### Request

```ts
type LoginUserInput = {
  email: string;
  password: string;
};
```

### Validation Rules

| Field | Rule |
|---|---|
| email | Required, must be valid email |
| password | Required |

### Success Response

```ts
type LoginUserResponse = {
  user: UserProfile;
  redirectTo: string;
};
```

### Redirect Rules

| Role | Redirect To |
|---|---|
| customer | /venues |
| venue_owner | /dashboard |
| event_coordinator | /dashboard |
| supplier | /dashboard |
| admin | /admin |

### Possible Errors

| Code | Message |
|---|---|
| AUTH_INVALID_CREDENTIALS | Invalid email or password |
| AUTH_EMAIL_NOT_VERIFIED | Please verify your email before logging in |
| AUTH_ACCOUNT_DISABLED | This account has been disabled |
| AUTH_LOGIN_FAILED | Failed to login |

### Frontend Behavior

- Show validation errors for missing email or password.
- Disable submit button while logging in.
- On success, redirect based on the user's role.
- If the user's role is not recognized, redirect to `/unauthorized`.

---

## 2.3 Logout User

Used by:

```txt
Navbar
Sidebar
Account page
Dashboard layouts
```

### Frontend Function

```ts
logoutUser(): Promise<ApiResponse<null>>
```

### Request

No request body required.

### Success Response

```ts
null
```

### Possible Errors

| Code | Message |
|---|---|
| AUTH_LOGOUT_FAILED | Failed to logout user |

### Frontend Behavior

- Clear the current session.
- Redirect the user to `/login` or the marketing homepage.
- Hide role-specific dashboard links after logout.

---

## 2.4 Get Current User

Used by:

```txt
Protected pages
Navbar
Middleware
Role-based layouts
```

### Frontend Function

```ts
getCurrentUser(): Promise<ApiResponse<GetCurrentUserResponse>>
```

### Request

No request body required. The current session is read from Supabase Auth.

### Success Response

```ts
type GetCurrentUserResponse = {
  user: UserProfile | null;
};
```

### Possible Errors

| Code | Message |
|---|---|
| AUTH_SESSION_EXPIRED | User session has expired |
| AUTH_USER_FETCH_FAILED | Failed to fetch current user |

### Frontend Behavior

- If `user` is `null`, treat the user as logged out.
- If the route requires authentication, redirect to `/login`.
- If the route requires a specific role, validate the user's role before rendering the page.

---

## 2.5 Forgot Password

Used by:

```txt
/forgot-password
```

### Frontend Function

```ts
forgotPassword(input: ForgotPasswordInput): Promise<ApiResponse<null>>
```

### Request

```ts
type ForgotPasswordInput = {
  email: string;
};
```

### Validation Rules

| Field | Rule |
|---|---|
| email | Required, must be valid email |

### Success Response

```ts
null
```

### Success Message

```txt
Password reset link has been sent to your email.
```

### Possible Errors

| Code | Message |
|---|---|
| AUTH_INVALID_EMAIL | Invalid email address |
| AUTH_EMAIL_NOT_FOUND | No account found with this email |
| AUTH_RESET_EMAIL_FAILED | Failed to send password reset email |

### Frontend Behavior

- Show success message after sending reset email.
- Do not reveal sensitive account information beyond the standard response message.
- Provide a link back to `/login`.

---

## 2.6 Reset Password

Used by:

```txt
/reset-password
```

### Frontend Function

```ts
resetPassword(input: ResetPasswordInput): Promise<ApiResponse<null>>
```

### Request

```ts
type ResetPasswordInput = {
  password: string;
  confirmPassword: string;
};
```

### Validation Rules

| Field | Rule |
|---|---|
| password | Required, minimum 8 characters |
| confirmPassword | Required, must match password |

### Success Response

```ts
null
```

### Success Message

```txt
Password has been reset successfully.
```

### Possible Errors

| Code | Message |
|---|---|
| AUTH_WEAK_PASSWORD | Password must be at least 8 characters |
| AUTH_PASSWORD_MISMATCH | Passwords do not match |
| AUTH_RESET_TOKEN_EXPIRED | Password reset link has expired |
| AUTH_PASSWORD_RESET_FAILED | Failed to reset password |

### Frontend Behavior

- Validate password and confirm password before submitting.
- On success, redirect to `/login`.
- If token is expired, show an error and provide a link to request a new reset email.

---

## 2.7 Verify Email

Used by:

```txt
/verify-email
/auth/callback
```

### Frontend Function

```ts
verifyEmail(): Promise<ApiResponse<VerifyEmailResponse>>
```

### Request

The verification token is handled through the Supabase email verification callback URL.

### Success Response

```ts
type VerifyEmailResponse = {
  user: UserProfile;
  message: "Email verified successfully.";
};
```

### Possible Errors

| Code | Message |
|---|---|
| AUTH_VERIFICATION_EXPIRED | Email verification link has expired |
| AUTH_VERIFICATION_FAILED | Failed to verify email |

### Frontend Behavior

- Show loading state while verifying.
- On success, show confirmation and redirect to `/login` or the correct dashboard.
- On failure, show an error and provide an option to resend verification email.

---

## 2.8 Resend Verification Email

Used by:

```txt
/verify-email
/login
```

### Frontend Function

```ts
resendVerificationEmail(input: ResendVerificationEmailInput): Promise<ApiResponse<null>>
```

### Request

```ts
type ResendVerificationEmailInput = {
  email: string;
};
```

### Validation Rules

| Field | Rule |
|---|---|
| email | Required, must be valid email |

### Success Response

```ts
null
```

### Success Message

```txt
Verification email has been sent.
```

### Possible Errors

| Code | Message |
|---|---|
| AUTH_INVALID_EMAIL | Invalid email address |
| AUTH_VERIFICATION_EMAIL_FAILED | Failed to send verification email |

---

## 2.9 Update Profile

Used by:

```txt
/account
```

### Frontend Function

```ts
updateProfile(input: UpdateProfileInput): Promise<ApiResponse<UpdateProfileResponse>>
```

### Request

```ts
type UpdateProfileInput = {
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
};
```

### Validation Rules

| Field | Rule |
|---|---|
| fullName | Optional, minimum 2 characters |
| phoneNumber | Optional, must be a valid phone number |
| avatarUrl | Optional, must be a valid image URL |

### Success Response

```ts
type UpdateProfileResponse = {
  user: UserProfile;
  message: "Profile updated successfully.";
};
```

### Possible Errors

| Code | Message |
|---|---|
| AUTH_REQUIRED | User must be logged in |
| PROFILE_UPDATE_FAILED | Failed to update profile |
| PROFILE_INVALID_INPUT | Invalid profile information |

### Frontend Behavior

- Only allow authenticated users to update profiles.
- Show validation messages before submitting.
- On success, update the displayed user information in the account page and navigation menu.

---

## 2.10 Upload Avatar

Used by:

```txt
/account
```

### Frontend Function

```ts
uploadAvatar(input: UploadAvatarInput): Promise<ApiResponse<UploadAvatarResponse>>
```

### Request

```ts
type UploadAvatarInput = {
  file: File;
};
```

### Validation Rules

| Field | Rule |
|---|---|
| file | Required |
| file type | Must be JPG, PNG, or WebP |
| file size | Maximum 2MB |

### Success Response

```ts
type UploadAvatarResponse = {
  avatarUrl: string;
};
```

### Possible Errors

| Code | Message |
|---|---|
| AUTH_REQUIRED | User must be logged in |
| AVATAR_INVALID_TYPE | Avatar must be JPG, PNG, or WebP |
| AVATAR_FILE_TOO_LARGE | Avatar must not exceed 2MB |
| AVATAR_UPLOAD_FAILED | Failed to upload avatar |

---

## 2.11 Role-Based Access Rules

| Page / Feature | Allowed Roles |
|---|---|
| / | public |
| /about | public |
| /pricing | public |
| /login | public |
| /register | public |
| /forgot-password | public |
| /reset-password | public with valid reset session |
| /verify-email | public with valid verification token |
| /venues | customer, venue_owner, event_coordinator, supplier, admin |
| /venues/[slug] | customer, venue_owner, event_coordinator, supplier, admin |
| /venues/[slug]/book | customer, event_coordinator, admin |
| /account | customer, venue_owner, event_coordinator, supplier, admin |
| /bookings | customer, event_coordinator, admin |
| /favorites | customer, event_coordinator, admin |
| /dashboard | venue_owner, event_coordinator, supplier |
| /dashboard/analytics | venue_owner, event_coordinator |
| /dashboard/bookings | venue_owner, event_coordinator |
| /dashboard/calendar | venue_owner, event_coordinator |
| /dashboard/packages | venue_owner, event_coordinator |
| /dashboard/staff | venue_owner |
| /admin | admin |
| /admin/users | admin |
| /admin/venues | admin |
| /admin/suppliers | admin |
| /admin/reports | admin |
| /admin/commissions | admin |

If the user does not have permission, redirect to:

```txt
/unauthorized
```

If the user is not logged in and the page is protected, redirect to:

```txt
/login
```

---

## 2.12 Auth State UI Rules

| State | Frontend Behavior |
|---|---|
| Loading session | Show loading spinner or skeleton |
| Not logged in | Show login and register buttons |
| Logged in | Show user menu and logout button |
| Unauthorized role | Redirect to `/unauthorized` |
| Session expired | Redirect to `/login` |
| Email not verified | Show verification notice |
| Account disabled | Show account disabled message |

---

## 2.13 Auth Security Rules

- Do not expose Supabase service role keys in frontend code.
- Use Supabase anon key only on the client side.
- Use server-side role checks for protected actions.
- Do not rely only on hidden frontend buttons for security.
- Validate all user input before sending it to Supabase.
- Keep profile role updates restricted to administrators.
- Redirect unauthorized users instead of rendering protected content.

---

# 3. Venue Marketplace Contracts

## 3.1 Get Venue List

Used by:

```txt
/venues
```

### Frontend Function

```ts
getVenues(filters: VenueFilters): Promise<ApiResponse<PaginatedResponse<VenueCard[]>>>
```

### Request

```ts
type VenueFilters = {
  keyword?: string;
  province?: string;
  city?: string;
  eventType?: string;
  venueStyle?: "hotel" | "beach" | "garden" | "resort" | "restaurant" | "function_hall" | "church";
  minBudget?: number;
  maxBudget?: number;
  minCapacity?: number;
  amenities?: string[];
  page?: number;
  limit?: number;
};
```

### Response

```ts
type VenueCard = {
  id: string;
  slug: string;
  name: string;
  description: string;
  city: string;
  province: string;
  startingPrice: number;
  maxCapacity: number;
  rating: number;
  reviewCount: number;
  featuredImageUrl: string;
  venueStyle: string;
  amenities: string[];
  isFeatured: boolean;
};

type PaginatedResponse<T> = {
  items: T;
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};
```

### Possible Errors

| Code | Message |
|---|---|
| VENUE_FETCH_FAILED | Failed to fetch venues |
| VENUE_INVALID_FILTERS | Invalid search filters |

---

## 3.2 Get Venue Details

Used by:

```txt
/venues/[slug]
```

### Frontend Function

```ts
getVenueBySlug(slug: string): Promise<ApiResponse<VenueDetails>>
```

### Request

```ts
type GetVenueBySlugInput = {
  slug: string;
};
```

### Response

```ts
type VenueDetails = {
  id: string;
  slug: string;
  name: string;
  description: string;
  city: string;
  province: string;
  address: string;
  latitude?: number;
  longitude?: number;
  startingPrice: number;
  maxCapacity: number;
  minCapacity?: number;
  venueStyle: string;
  amenities: string[];
  rules?: string;
  cancellationPolicy?: string;
  operatingHours?: string;
  contactEmail?: string;
  contactPhone?: string;
  images: VenueImage[];
  packages: VenuePackage[];
  rating: number;
  reviewCount: number;
};

type VenueImage = {
  id: string;
  url: string;
  altText?: string;
  isFeatured: boolean;
};

type VenuePackage = {
  id: string;
  name: string;
  description?: string;
  price: number;
  inclusions: string[];
  maxGuests: number;
};
```

### Possible Errors

| Code | Message |
|---|---|
| VENUE_NOT_FOUND | Venue does not exist |
| VENUE_FETCH_FAILED | Failed to fetch venue details |

---

## 3.3 Get Venue Availability

Used by:

```txt
/venues/[slug]/book
```

### Frontend Function

```ts
getVenueAvailability(input: VenueAvailabilityInput): Promise<ApiResponse<VenueAvailability[]>>
```

### Request

```ts
type VenueAvailabilityInput = {
  venueId: string;
  month: number;
  year: number;
};
```

### Response

```ts
type VenueAvailability = {
  date: string;
  status: "available" | "reserved" | "tentative" | "maintenance" | "blackout";
  seasonalPrice?: number;
};
```

### Possible Errors

| Code | Message |
|---|---|
| AVAILABILITY_FETCH_FAILED | Failed to fetch availability |
| VENUE_NOT_FOUND | Venue does not exist |

---

# 4. Booking Contracts

## 4.1 Create Booking Request

Used by:

```txt
/venues/[slug]/book
```

### Frontend Function

```ts
createBooking(input: CreateBookingInput): Promise<ApiResponse<Booking>>
```

### Request

```ts
type CreateBookingInput = {
  venueId: string;
  packageId?: string;
  eventDate: string;
  eventType: string;
  guestCount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  message?: string;
};
```

### Response

```ts
type Booking = {
  id: string;
  venueId: string;
  customerId: string;
  packageId?: string;
  eventDate: string;
  eventType: string;
  guestCount: number;
  status: "pending" | "approved" | "declined" | "paid" | "confirmed" | "cancelled" | "completed";
  totalAmount?: number;
  createdAt: string;
};
```

### Possible Errors

| Code | Message |
|---|---|
| BOOKING_DATE_UNAVAILABLE | Selected date is not available |
| BOOKING_INVALID_GUEST_COUNT | Guest count is outside venue capacity |
| BOOKING_CREATE_FAILED | Failed to create booking request |
| AUTH_REQUIRED | User must be logged in to book |

---

# 5. Notes for Frontend Developers

- Always validate form input before sending requests.
- Always show loading, empty, success, and error states.
- Do not expose Supabase service role keys in the frontend.
- Use the logged-in user's role to control UI visibility.
- Use server-side checks for protected actions.
- Keep API response shapes consistent across features.
- Store money values as numbers in Philippine Peso.
- Use ISO string format for dates.

