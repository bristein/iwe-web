'use client';

import React from 'react';
import { Box, Input, Field, InputProps } from '@chakra-ui/react';

interface FormFieldProps extends InputProps {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export function FormField({
  label,
  error,
  helperText,
  required = false,
  ...inputProps
}: FormFieldProps) {
  return (
    <Field.Root invalid={!!error} required={required}>
      <Field.Label fontSize="sm" fontWeight="semibold" color="fg.default" mb="2">
        {label}
      </Field.Label>
      <Input
        size="lg"
        borderRadius="lg"
        borderColor="border.default"
        bg="bg.default"
        _hover={{
          borderColor: 'brand.300',
        }}
        _focus={{
          borderColor: 'brand.500',
          boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
          bg: 'bg.default',
        }}
        _invalid={{
          borderColor: 'error.500',
          boxShadow: '0 0 0 1px var(--chakra-colors-error-500)',
        }}
        {...inputProps}
      />
      {helperText && !error && (
        <Field.HelperText color="fg.muted" fontSize="sm" mt="1">
          {helperText}
        </Field.HelperText>
      )}
      {error && (
        <Field.ErrorText fontSize="sm" mt="1">
          {error}
        </Field.ErrorText>
      )}
    </Field.Root>
  );
}
