'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { VStack, Text, Link, Alert } from '@chakra-ui/react';
import { useAuth } from '@/app/contexts/AuthContext';
import { FormField, FormButton, PageContainer, FormCard } from '@/components';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [hasAuthToken, setHasAuthToken] = useState(false);

  const { login, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/portal';
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
      router.replace(from);
    }
  }, [user, router, from, forceAccess]);

  const validateForm = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    // Email validation
    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    // Password validation
    if (!password) {
      setPasswordError('Password is required');
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
      const result = await login(email, password);

      if (result.success) {
        router.replace(from);
      } else {
        setError(result.error || 'Login failed');
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

  const footerContent = (
    <Text color="fg.muted">
      Don&apos;t have an account?{' '}
      <Link
        href={hasAuthToken || forceAccess ? '/signup?force=true' : '/signup'}
        color="brand.600"
        fontWeight="semibold"
        _hover={{
          color: 'brand.700',
          textDecoration: 'underline',
        }}
      >
        Sign up
      </Link>
    </Text>
  );

  return (
    <PageContainer fullHeight centerContent maxW="md">
      <FormCard
        title="Welcome Back"
        subtitle="Sign in to your IWE Web account"
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
              label="Password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Enter your password"
              autoComplete="current-password"
              error={passwordError}
              required
            />

            <FormButton
              type="submit"
              width="100%"
              loading={loading}
              loadingText="Signing in..."
              variant="primary"
              mt="2"
            >
              Sign In
            </FormButton>
          </VStack>
        </form>
      </FormCard>
    </PageContainer>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <FormCard title="Loading...">Please wait...</FormCard>
        </PageContainer>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
