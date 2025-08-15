'use client';

import React from 'react';
import { Box, Card, Heading, Text, VStack } from '@chakra-ui/react';

interface DashboardCardProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  hover?: boolean;
}

export function DashboardCard({
  children,
  title,
  description,
  icon,
  hover = true,
}: DashboardCardProps) {
  return (
    <Card.Root
      bg="bg.default"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="border.default"
      shadow="sm"
      p="6"
      transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
      _hover={
        hover
          ? {
              shadow: 'lg',
              transform: 'translateY(-2px)',
              borderColor: 'brand.200',
            }
          : {}
      }
      cursor={hover ? 'pointer' : 'default'}
    >
      <VStack gap="4" align="stretch">
        {icon && (
          <Box color="brand.600" fontSize="2xl">
            {icon}
          </Box>
        )}

        <Box>
          <Heading size="lg" color="fg.default" fontWeight="semibold" mb="2">
            {title}
          </Heading>
          {description && (
            <Text color="fg.muted" fontSize="md" lineHeight="relaxed" mb="4">
              {description}
            </Text>
          )}
        </Box>

        {children}
      </VStack>
    </Card.Root>
  );
}
