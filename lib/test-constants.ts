/**
 * Test Constants
 *
 * This file contains all the UI text, selectors, and validation messages
 * used throughout the application. Tests should import these constants
 * instead of hardcoding values to ensure consistency and maintainability.
 */

// Page Titles and Headings
export const PAGE_TITLES = {
  SIGNUP: 'Create Account',
  SIGNUP_SUBTITLE: 'Join IWE Web and start your writing journey',
  LOGIN: 'Welcome Back',
  LOGIN_SUBTITLE: 'Sign in to your IWE Web account',
  PORTAL: "Writer's Portal",
  HOME: 'Interactive Writing Experience',
} as const;

// Form Labels
export const FORM_LABELS = {
  NAME: 'Full Name',
  EMAIL: 'Email',
  PASSWORD: 'Password',
  USERNAME: 'Username (Optional)',
  CONFIRM_PASSWORD: 'Confirm Password',
} as const;

// Button Text
export const BUTTON_TEXT = {
  SIGNUP: 'Create Account',
  LOGIN: 'Sign In',
  LOGOUT: 'Logout',
  CREATE_ACCOUNT: 'Create Account',
  SIGN_IN: 'Sign In',
  SUBMIT: 'Submit',
} as const;

// Navigation Links
export const NAV_LINKS = {
  LOGIN: 'Sign in',
  SIGNUP: 'Sign up',
  ALREADY_HAVE_ACCOUNT: 'Already have an account?',
  DONT_HAVE_ACCOUNT: "Don't have an account?",
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  SIGNUP: 'Account created successfully',
  LOGIN: 'Logged in successfully',
  LOGOUT: 'Logged out successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
} as const;

// Error Messages - matching actual validation messages
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  PASSWORD_MIN_LENGTH: 'Password must be at least 8 characters',
  USERNAME_MIN_LENGTH: 'Username must be at least 3 characters',
  PASSWORDS_DONT_MATCH: 'Passwords do not match',
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_ALREADY_EXISTS: 'A user with this email already exists',
  USER_NOT_FOUND: 'User not found',
  UNAUTHORIZED: 'Unauthorized',
  SOMETHING_WENT_WRONG: 'Something went wrong',
  NAME_REQUIRED: 'Name is required',
  EMAIL_REQUIRED: 'Email is required',
  PASSWORD_REQUIRED: 'Password is required',
} as const;

// Test IDs and Selectors
export const TEST_IDS = {
  // Navigation
  NAV_LOGIN: 'nav-login',
  NAV_SIGNUP: 'nav-signup',
  NAV_LOGOUT: 'nav-logout',

  // Forms
  SIGNUP_FORM: 'signup-form',
  LOGIN_FORM: 'login-form',

  // Form Fields
  NAME_INPUT: 'name-input',
  EMAIL_INPUT: 'email-input',
  PASSWORD_INPUT: 'password-input',
  CONFIRM_PASSWORD_INPUT: 'confirm-password-input',

  // Buttons
  SUBMIT_BUTTON: 'submit-button',

  // Portal Elements
  USER_NAME: 'user-name',
  USER_EMAIL: 'user-email',
  WELCOME_HEADING: 'welcome-heading',

  // Messages
  ERROR_MESSAGE: 'error-message',
  SUCCESS_MESSAGE: 'success-message',
} as const;

// API Routes
export const API_ROUTES = {
  SIGNUP: '/api/auth/signup',
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  ME: '/api/auth/me',
  UPDATE_PROFILE: '/api/auth/update',
} as const;

// Page Routes
export const PAGE_ROUTES = {
  HOME: '/',
  SIGNUP: '/signup',
  LOGIN: '/login',
  PORTAL: '/portal',
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  LOGIN: {
    WINDOW_MS: 5 * 60 * 1000, // 5 minutes
    MAX_REQUESTS: 10,
    MESSAGE: 'Too many authentication attempts, please try again later',
  },
  SIGNUP: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_REQUESTS: 20,
    MESSAGE: 'Too many signup attempts, please try again later',
  },
} as const;

// JWT Configuration
export const JWT_CONFIG = {
  EXPIRY: '24h',
  ALGORITHM: 'HS256' as const,
} as const;

// Password Requirements
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: false,
  REQUIRE_LOWERCASE: false,
  REQUIRE_NUMBER: false,
  REQUIRE_SPECIAL: false,
} as const;

// Test User Data
export const TEST_USER = {
  NAME: 'Test User',
  EMAIL_PREFIX: 'test',
  PASSWORD: 'password123',
  UPDATED_NAME: 'Updated User',
} as const;

// Helper function to generate unique test emails
export function generateTestEmail(prefix: string = TEST_USER.EMAIL_PREFIX): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-${timestamp}-${random}@example.com`;
}

// Helper function to check if running in test mode
export function isTestMode(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true';
}
