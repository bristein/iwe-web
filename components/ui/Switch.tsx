'use client';

import React from 'react';
import { HStack, VStack, Text, Box } from '@chakra-ui/react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  'data-testid'?: string;
  'aria-label'?: string;
  id?: string;
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  'data-testid': dataTestId,
  'aria-label': ariaLabel,
  id,
}: SwitchProps) {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <HStack justify="space-between" w="full">
      <VStack align="start" gap="1" flex="1">
        <Text fontWeight="medium" color={disabled ? 'fg.muted' : 'fg.default'}>
          {label}
        </Text>
        {description && (
          <Text fontSize="sm" color="fg.muted">
            {description}
          </Text>
        )}
      </VStack>
      <Box
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        onClick={handleToggle}
        data-testid={dataTestId}
        id={id}
        cursor={disabled ? 'not-allowed' : 'pointer'}
        opacity={disabled ? 0.6 : 1}
        position="relative"
        w="12"
        h="6"
        bg={checked ? 'brand.500' : 'gray.300'}
        borderRadius="full"
        transition="all 0.2s"
        _hover={!disabled ? { transform: 'scale(1.05)' } : undefined}
        _focus={{
          outline: '2px solid',
          outlineColor: 'brand.500',
          outlineOffset: '2px',
        }}
      >
        <Box
          position="absolute"
          top="0.5"
          left={checked ? '6' : '0.5'}
          w="5"
          h="5"
          bg="white"
          borderRadius="full"
          transition="all 0.2s"
          boxShadow="sm"
        />
      </Box>
    </HStack>
  );
}
