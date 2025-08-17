'use client';

import React from 'react';
import { Box, Container, Flex, Heading, HStack, Text, Button, Skeleton } from '@chakra-ui/react';
import { useAuth } from '@/app/contexts/AuthContext';
import { ColorModeButton } from '@/components/ui/color-mode';
import { FormButton } from '@/components';
import { useRouter } from 'next/navigation';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <Box minH="100vh" bg="bg.canvas">
        <Box borderBottomWidth="1px" borderColor="border.muted" bg="bg.default" shadow="sm">
          <Container maxW="7xl" py="4">
            <Flex justify="space-between" align="center">
              <Skeleton height="8" width="32" borderRadius="md" />
              <HStack gap="3">
                <Skeleton height="8" width="8" borderRadius="full" />
                <Skeleton height="8" width="20" borderRadius="md" />
              </HStack>
            </Flex>
          </Container>
        </Box>
        <Container maxW="7xl" py="8">
          <Skeleton height="400px" borderRadius="xl" />
        </Container>
      </Box>
    );
  }

  if (!user) {
    return (
      <Container maxW="md" py="12">
        <Box
          p="6"
          borderWidth="1px"
          borderRadius="xl"
          borderColor="error.300"
          bg="error.50"
          shadow="sm"
        >
          <Text fontWeight="semibold" color="error.700" fontSize="lg">
            Authentication Required
          </Text>
          <Text color="error.600" mt="2" lineHeight="relaxed">
            You need to be logged in to access this page.
          </Text>
        </Box>
      </Container>
    );
  }

  return (
    <Box minH="100vh" bg="bg.canvas">
      {/* Header */}
      <Box borderBottomWidth="1px" borderColor="border.muted" bg="bg.default" shadow="sm">
        <Container maxW="7xl" py="6">
          <Flex justify="space-between" align="center">
            <HStack gap="3">
              <Box
                w={10}
                h={10}
                bgGradient="to-br"
                gradientFrom="brand.500"
                gradientTo="brand.700"
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="white" fontWeight="bold" fontSize="lg">
                  IW
                </Text>
              </Box>
              <Heading size="xl" color="fg.default" fontWeight="bold" letterSpacing="tight">
                IWE Web Portal
              </Heading>
            </HStack>

            <HStack gap="4">
              <ColorModeButton />

              <FormButton
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                data-testid="logout-button"
              >
                <HStack gap="3">
                  <Box
                    w="10"
                    h="10"
                    borderRadius="full"
                    bgGradient="to-br"
                    gradientFrom="brand.400"
                    gradientTo="brand.600"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="sm"
                    fontWeight="bold"
                    color="white"
                    data-testid="user-avatar"
                  >
                    {user.name?.charAt(0).toUpperCase()}
                  </Box>
                  <Box textAlign="left">
                    <Text
                      fontSize="sm"
                      fontWeight="semibold"
                      data-testid="user-name"
                      color="fg.default"
                    >
                      {user.name}
                    </Text>
                    <Text fontSize="xs" color="fg.muted" data-testid="user-email">
                      {user.email}
                    </Text>
                  </Box>
                </HStack>
              </FormButton>
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxW="7xl" py="10">
        {children}
      </Container>
    </Box>
  );
}
