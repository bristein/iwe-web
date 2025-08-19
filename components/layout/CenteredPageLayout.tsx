'use client';

import React from 'react';
import { Box, Container, ContainerProps } from '@chakra-ui/react';

interface CenteredPageLayoutProps extends ContainerProps {
  children: React.ReactNode;
  /**
   * Whether to apply full height to the container (100vh)
   */
  fullHeight?: boolean;
  /**
   * Whether to center content vertically and horizontally
   */
  centerContent?: boolean;
  /**
   * Background color for the outer wrapper
   */
  bgColor?: string;
  /**
   * Additional padding for the container
   */
  containerPadding?: string | number;
}

/**
 * CenteredPageLayout provides a consistent, centered layout for pages
 * with proper max-width constraints and responsive behavior.
 *
 * Features:
 * - Centers content horizontally with max-width constraints
 * - Optional vertical centering
 * - Responsive design with consistent padding
 * - Works well with Chakra UI theme system
 */
export function CenteredPageLayout({
  children,
  fullHeight = false,
  centerContent = false,
  bgColor = 'bg.canvas',
  containerPadding = '8',
  maxW = '7xl',
  ...containerProps
}: CenteredPageLayoutProps) {
  return (
    <Box
      minH={fullHeight ? '100vh' : 'auto'}
      bg={bgColor}
      display={centerContent ? 'flex' : 'block'}
      alignItems={centerContent ? 'center' : 'stretch'}
      justifyContent={centerContent ? 'center' : 'flex-start'}
      py={centerContent ? '12' : containerPadding}
      px={centerContent ? '4' : '0'}
    >
      <Container maxW={maxW} px={centerContent ? '6' : '4'} width="100%" {...containerProps}>
        {children}
      </Container>
    </Box>
  );
}
