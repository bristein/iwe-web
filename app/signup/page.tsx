'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { VStack, Text, Link, Alert } from '@chakra-ui/react';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  FormField,
  FormButton,
  PageContainer,
  FormCard,
  PasswordStrengthIndicator,
} from '@/components';

function SignupContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [hasAuthToken, setHasAuthToken] = useState(false);

  const { signup, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceAccess = searchParams.get('force') === 'true';

  // Check if user has auth token (even if not fully loaded)
  useEffect(() => {
    const checkAuthToken = () => {
      const cookies = document.cookie.split(';');
      const authTokenExists = cookies.some((cookie) => cookie.trim().startsWith('auth-token='));
      setHasAuthToken(authTokenExists);
    };
    checkAuthToken();
  }, []);

  // Redirect if already logged in (unless force parameter is present)
  useEffect(() => {
    if (user && !forceAccess) {
      router.replace('/portal');
    }
  }, [user, router, forceAccess]);

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password),
    ];

    strength = checks.filter(Boolean).length;
    return { strength, total: checks.length };
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthPercentage = (passwordStrength.strength / passwordStrength.total) * 100;
  const strengthColor =
    strengthPercentage < 40 ? 'red' : strengthPercentage < 80 ? 'yellow' : 'green';

  const validateForm = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setNameError('');
    setUsernameError('');

    // Name validation
    if (!name.trim()) {
      setNameError('Name is required');
      isValid = false;
    }

    // Email validation
    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    // Username validation (optional but if provided, must be valid)
    if (username && username.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      isValid = false;
    }

    // Password validation
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const signupData = {
        email,
        password,
        name: name.trim(),
        ...(username.trim() && { username: username.trim() }),
      };

      const result = await signup(signupData);

      if (result.success) {
        router.replace('/portal');
      } else {
        setError(result.error || 'Signup failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
    if (error) setError('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError('');
    if (error) setError('');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (nameError) setNameError('');
    if (error) setError('');
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (usernameError) setUsernameError('');
    if (error) setError('');
  };

  const footerContent = (
    <Text color="fg.muted">
      Already have an account?{' '}
      <Link
        href={hasAuthToken || forceAccess ? '/login?force=true' : '/login'}
        color="brand.600"
        fontWeight="semibold"
        _hover={{
          color: 'brand.700',
          textDecoration: 'underline',
        }}
      >
        Sign in
      </Link>
    </Text>
  );

  return (
    <PageContainer fullHeight centerContent maxW="md">
      <FormCard
        title="Create Account"
        subtitle="Join IWE Web and start your writing journey"
        footer={footerContent}
      >
        <form onSubmit={handleSubmit} noValidate>
          <VStack gap="6">
            {error && (
              <Alert.Root status="error" width="100%" borderRadius="lg">
                <Alert.Indicator />
                <Alert.Title>Error</Alert.Title>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Root>
            )}

            <FormField
              label="Full Name"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Enter your full name"
              autoComplete="name"
              error={nameError}
              required
            />

            <FormField
              label="Email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="Enter your email"
              autoComplete="email"
              error={emailError}
              required
            />

            <FormField
              label="Username (Optional)"
              type="text"
              value={username}
              onChange={handleUsernameChange}
              placeholder="Choose a username"
              autoComplete="username"
              error={usernameError}
              helperText="Minimum 3 characters"
            />

            <VStack gap="3" align="stretch" width="100%">
              <FormField
                label="Password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter your password"
                autoComplete="new-password"
                error={passwordError}
                required
              />
              <PasswordStrengthIndicator password={password} />
            </VStack>

            <FormButton
              type="submit"
              width="100%"
              loading={loading}
              loadingText="Creating account..."
              variant="primary"
              mt="2"
            >
              Create Account
            </FormButton>
          </VStack>
        </form>
      </FormCard>
    </PageContainer>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <FormCard title="Loading...">Please wait...</FormCard>
        </PageContainer>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
