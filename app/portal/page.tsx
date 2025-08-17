'use client';

import React from 'react';
import { Box, Heading, Text, VStack, HStack, Grid } from '@chakra-ui/react';
import { useAuth } from '@/app/contexts/AuthContext';
import { DashboardCard, FormButton } from '@/components';
import { FaFileAlt, FaUsers, FaCog } from 'react-icons/fa';

export default function PortalPage() {
  const { user } = useAuth();

  return (
    <VStack gap="10" align="stretch">
      <Box textAlign="center">
        <Heading
          size="3xl"
          mb="4"
          data-testid="welcome-heading"
          bgGradient="to-r"
          gradientFrom="brand.600"
          gradientTo="brand.800"
          bgClip="text"
          fontWeight="bold"
          letterSpacing="tight"
        >
          Welcome back, {user?.name}!
        </Heading>
        <Text color="fg.muted" fontSize="xl" lineHeight="relaxed">
          Ready to continue your writing journey?
        </Text>
      </Box>

      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap="8">
        <DashboardCard
          title="Projects"
          description="Manage your writing projects and manuscripts."
          icon={<FaFileAlt />}
        >
          <FormButton variant="primary" size="md" data-testid="projects-button" width="100%">
            View Projects
          </FormButton>
        </DashboardCard>

        <DashboardCard
          title="Characters"
          description="Create and manage your story characters."
          icon={<FaUsers />}
        >
          <FormButton variant="secondary" size="md" data-testid="characters-button" width="100%">
            View Characters
          </FormButton>
        </DashboardCard>

        <DashboardCard
          title="Settings"
          description="Customize your account and preferences."
          icon={<FaCog />}
        >
          <FormButton variant="outline" size="md" data-testid="settings-button" width="100%">
            View Settings
          </FormButton>
        </DashboardCard>
      </Grid>

      {user && (
        <Box
          borderWidth="1px"
          borderColor="border.default"
          borderRadius="2xl"
          p="8"
          bg="bg.default"
          shadow="lg"
        >
          <Heading size="xl" color="fg.default" mb="6" fontWeight="semibold">
            Account Information
          </Heading>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap="6">
            <VStack gap="4" align="start">
              <HStack>
                <Text fontWeight="semibold" color="fg.default" minW="20">
                  Email:
                </Text>
                <Text data-testid="account-email" color="fg.muted">
                  {user.email}
                </Text>
              </HStack>
              <HStack>
                <Text fontWeight="semibold" color="fg.default" minW="20">
                  Role:
                </Text>
                <Text data-testid="account-role" color="fg.muted">
                  {user.role}
                </Text>
              </HStack>
            </VStack>
            <VStack gap="4" align="start">
              {user.username && (
                <HStack>
                  <Text fontWeight="semibold" color="fg.default" minW="20">
                    Username:
                  </Text>
                  <Text data-testid="account-username" color="fg.muted">
                    {user.username}
                  </Text>
                </HStack>
              )}
              <HStack>
                <Text fontWeight="semibold" color="fg.default" minW="20">
                  Member since:
                </Text>
                <Text data-testid="account-created" color="fg.muted">
                  {new Date(user.createdAt).toLocaleDateString()}
                </Text>
              </HStack>
            </VStack>
          </Grid>
        </Box>
      )}
    </VStack>
  );
}
