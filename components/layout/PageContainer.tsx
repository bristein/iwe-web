'use client';

import React from 'react';
import { Box, Container, ContainerProps } from '@chakra-ui/react';

interface PageContainerProps extends ContainerProps {
  children: React.ReactNode;
  fullHeight?: boolean;
  centerContent?: boolean;
}

export function PageContainer({
  children,
  fullHeight = false,
  centerContent = false,
  ...containerProps
}: PageContainerProps) {
  return (
    <Box
      minH={fullHeight ? '100vh' : 'auto'}
      bg="bg.canvas"
      display={centerContent ? 'flex' : 'block'}
      alignItems={centerContent ? 'center' : 'stretch'}
      justifyContent={centerContent ? 'center' : 'flex-start'}
      py={centerContent ? '12' : '8'}
      px={centerContent ? '4' : '0'}
    >
      <Container maxW="7xl" {...containerProps} width="100%">
        {children}
      </Container>
    </Box>
  );
}
