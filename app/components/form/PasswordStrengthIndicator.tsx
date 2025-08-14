'use client';

import React from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
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

  if (!password) return null;

  const passwordStrength = getPasswordStrength(password);
  const strengthPercentage = (passwordStrength.strength / passwordStrength.total) * 100;

  const getStrengthColor = () => {
    if (strengthPercentage < 40) return 'error';
    if (strengthPercentage < 80) return 'warning';
    return 'success';
  };

  const getStrengthLabel = () => {
    if (strengthPercentage < 40) return 'Weak';
    if (strengthPercentage < 80) return 'Medium';
    return 'Strong';
  };

  const strengthColor = getStrengthColor();

  return (
    <Box bg="bg.subtle" p="4" borderRadius="lg" borderWidth="1px" borderColor="border.muted">
      <VStack gap="3" align="stretch">
        <HStack justify="space-between" fontSize="sm">
          <Text color="fg.muted" fontWeight="medium">
            Password strength:
          </Text>
          <Text color={`${strengthColor}.600`} fontWeight="semibold">
            {getStrengthLabel()}
          </Text>
        </HStack>

        <Box w="100%" h="2" bg="neutral.200" borderRadius="full" overflow="hidden">
          <Box
            h="100%"
            w={`${strengthPercentage}%`}
            bg={`${strengthColor}.500`}
            transition="all 0.3s ease-in-out"
            borderRadius="full"
          />
        </Box>

        <Text fontSize="xs" color="fg.muted" lineHeight="relaxed">
          Use at least 8 characters with uppercase, lowercase, numbers, and symbols
        </Text>
      </VStack>
    </Box>
  );
}
