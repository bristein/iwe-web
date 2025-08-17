// Authentication configuration with production safeguards

/**
 * Validates and returns the JWT secret with production safeguards
 */
export function getJwtSecret(): string {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  
  // Production safeguard: prevent test secrets in production
  if (process.env.NODE_ENV === 'production') {
    const testSecretPatterns = [
      'test',
      'demo',
      'example',
      'sample',
      'development',
      'dev',
      'local'
    ];
    
    const lowerSecret = jwtSecret.toLowerCase();
    const hasTestPattern = testSecretPatterns.some(pattern => 
      lowerSecret.includes(pattern)
    );
    
    if (hasTestPattern) {
      throw new Error(
        'SECURITY ERROR: Test/development JWT secret detected in production environment. ' +
        'Please set a secure, random JWT_SECRET for production use.'
      );
    }
    
    // Check for minimum length in production
    if (jwtSecret.length < 32) {
      throw new Error(
        'SECURITY ERROR: JWT secret is too short for production use. ' +
        'Please use a secret with at least 32 characters.'
      );
    }
  }
  
  return jwtSecret;
}

/**
 * Get the cookie options for authentication
 */
export function getAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  };
}

/**
 * Validates the overall authentication configuration
 */
export function validateAuthConfig(): void {
  try {
    getJwtSecret();
    
    // Log successful validation (but not the secret itself)
    console.log('✅ Authentication configuration validated successfully');
  } catch (error) {
    console.error('❌ Authentication configuration validation failed:', error);
    throw error;
  }
}