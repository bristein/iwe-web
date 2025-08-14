'use client';

import React from 'react';
import { Button, ButtonProps } from '@chakra-ui/react';

interface FormButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

export function FormButton({ variant = 'primary', children, ...buttonProps }: FormButtonProps) {
  const getVariantProps = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: 'brand.600',
          color: 'white',
          _hover: {
            bg: 'brand.700',
            transform: 'translateY(-1px)',
            boxShadow: 'lg',
          },
          _active: {
            bg: 'brand.800',
            transform: 'translateY(0)',
          },
          _disabled: {
            bg: 'neutral.300',
            color: 'neutral.500',
            cursor: 'not-allowed',
            _hover: {
              bg: 'neutral.300',
              transform: 'none',
              boxShadow: 'none',
            },
          },
        };
      case 'secondary':
        return {
          bg: 'secondary.600',
          color: 'white',
          _hover: {
            bg: 'secondary.700',
            transform: 'translateY(-1px)',
            boxShadow: 'lg',
          },
          _active: {
            bg: 'secondary.800',
            transform: 'translateY(0)',
          },
        };
      case 'outline':
        return {
          bg: 'transparent',
          color: 'brand.600',
          borderWidth: '2px',
          borderColor: 'brand.600',
          _hover: {
            bg: 'brand.50',
            transform: 'translateY(-1px)',
            boxShadow: 'md',
          },
          _active: {
            bg: 'brand.100',
            transform: 'translateY(0)',
          },
        };
      case 'ghost':
        return {
          bg: 'transparent',
          color: 'fg.muted',
          _hover: {
            bg: 'bg.muted',
            color: 'fg.default',
          },
        };
      default:
        return {};
    }
  };

  return (
    <Button
      size="lg"
      borderRadius="lg"
      fontWeight="semibold"
      transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
      {...getVariantProps()}
      {...buttonProps}
    >
      {children}
    </Button>
  );
}
