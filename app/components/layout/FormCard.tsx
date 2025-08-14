'use client';

import React from 'react';
import { Card, VStack, Heading, Text, Box } from '@chakra-ui/react';

interface FormCardProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export function FormCard({ children, title, subtitle, footer, maxWidth = 'md' }: FormCardProps) {
  return (
    <Card.Root
      maxW={maxWidth}
      mx="auto"
      bg="bg.default"
      borderRadius="2xl"
      borderWidth="1px"
      borderColor="border.muted"
      shadow="xl"
      overflow="hidden"
    >
      <Card.Header py="8" px="8" bg="bg.default">
        <VStack gap="3" textAlign="center">
          <Heading size="2xl" color="fg.default" fontWeight="bold" letterSpacing="tight">
            {title}
          </Heading>
          {subtitle && (
            <Text color="fg.muted" fontSize="lg" lineHeight="relaxed" maxW="sm">
              {subtitle}
            </Text>
          )}
        </VStack>
      </Card.Header>

      <Card.Body px="8" py="6">
        {children}
      </Card.Body>

      {footer && (
        <Card.Footer py="6" px="8" bg="bg.subtle" borderTopWidth="1px" borderColor="border.muted">
          <Box width="100%" textAlign="center">
            {footer}
          </Box>
        </Card.Footer>
      )}
    </Card.Root>
  );
}
