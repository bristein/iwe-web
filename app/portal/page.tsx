'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Grid,
  Badge,
  Spinner,
  Center,
  Alert,
} from '@chakra-ui/react';
import { useAuth } from '@/app/contexts/AuthContext';
import { DashboardCard, FormButton } from '@/components';
import { FaFileAlt, FaPlus, FaCog, FaBook, FaBookOpen, FaFeatherAlt } from 'react-icons/fa';
import { Project } from '@/lib/models/project';

export default function PortalPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(
    async (signal?: AbortSignal) => {
      if (!user?._id) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/projects?userId=${user._id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }

        const data = await response.json();
        setProjects(data);
      } catch (err) {
        if (err instanceof Error) {
          if (err.name !== 'AbortError') {
            console.error('Error fetching projects:', err);
            setError(err.message || 'Failed to load projects. Please try again.');
          }
        } else {
          setError('An unexpected error occurred. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchProjects(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchProjects]);

  const getProjectIcon = (genre?: string) => {
    // Map genre or use default icons based on common genres
    switch (genre?.toLowerCase()) {
      case 'fantasy':
      case 'sci-fi':
      case 'science fiction':
        return <FaBookOpen />;
      case 'short story':
      case 'poetry':
        return <FaFeatherAlt />;
      default:
        return <FaBook />;
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'draft':
      case 'planning':
        return 'gray';
      case 'active':
      case 'drafting':
        return 'blue';
      case 'editing':
        return 'yellow';
      case 'completed':
        return 'green';
      case 'archived':
        return 'red';
      default:
        return 'gray';
    }
  };

  const formatStatus = (status: Project['status']) => {
    return status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  };

  const handleProjectOpen = (projectId: string) => {
    // TODO: Navigate to project editor page
    console.log('Opening project:', projectId);
  };

  const handleRetry = () => {
    fetchProjects();
  };

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

      <Box>
        <HStack justify="space-between" mb="6">
          <Heading size="xl" color="fg.default">
            Your Projects
          </Heading>
          <FormButton variant="primary" size="md" data-testid="new-project-button">
            <HStack gap="2">
              <FaPlus />
              <Text>New Project</Text>
            </HStack>
          </FormButton>
        </HStack>

        {error ? (
          <Alert.Root status="error" borderRadius="xl">
            <Alert.Indicator />
            <Box flex="1">
              <Alert.Title>Error loading projects</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Box>
            <FormButton
              variant="outline"
              size="sm"
              onClick={handleRetry}
              data-testid="retry-projects-button"
            >
              Retry
            </FormButton>
          </Alert.Root>
        ) : loading ? (
          <Center py="10">
            <Spinner size="lg" color="brand.600" />
          </Center>
        ) : projects.length > 0 ? (
          <Grid
            templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
            gap="6"
          >
            {projects.map((project) => (
              <DashboardCard
                key={project._id?.toString()}
                title={project.title}
                description={project.description || 'No description provided'}
                icon={getProjectIcon(project.genre)}
              >
                <VStack align="stretch" gap="3">
                  <HStack justify="space-between">
                    <Badge colorScheme={getStatusColor(project.status)} size="sm">
                      {formatStatus(project.status)}
                    </Badge>
                    <Text fontSize="sm" color="fg.muted">
                      {project.wordCount?.toLocaleString() || 0} /{' '}
                      {project.wordCountGoal?.toLocaleString() || '—'} words
                    </Text>
                  </HStack>
                  {project.genre && (
                    <Text fontSize="xs" color="fg.muted">
                      Genre: {project.genre}
                    </Text>
                  )}
                  <Text fontSize="xs" color="fg.muted">
                    Last modified: {new Date(project.updatedAt).toLocaleDateString()}
                  </Text>
                  <FormButton
                    variant="secondary"
                    size="sm"
                    data-testid={`open-project-${project._id}`}
                    width="100%"
                    onClick={() => handleProjectOpen(project._id?.toString() || '')}
                    aria-label={`Open project ${project.title}`}
                  >
                    Open Project
                  </FormButton>
                </VStack>
              </DashboardCard>
            ))}
          </Grid>
        ) : (
          <Box
            borderWidth="2px"
            borderStyle="dashed"
            borderColor="border.default"
            borderRadius="xl"
            p="10"
            textAlign="center"
          >
            <VStack gap="4">
              <Box fontSize="4xl" color="fg.muted">
                <FaFileAlt />
              </Box>
              <Heading size="lg" color="fg.default">
                No projects yet
              </Heading>
              <Text color="fg.muted">
                Start your writing journey by creating your first project
              </Text>
              <FormButton variant="primary" size="lg" data-testid="create-first-project-button">
                <HStack gap="2">
                  <FaPlus />
                  <Text>Create Your First Project</Text>
                </HStack>
              </FormButton>
            </VStack>
          </Box>
        )}
      </Box>

      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap="8">
        <DashboardCard
          title="Quick Actions"
          description="Common tasks and shortcuts"
          icon={<FaFileAlt />}
        >
          <VStack align="stretch" gap="2">
            <FormButton variant="outline" size="sm" width="100%">
              Import Manuscript
            </FormButton>
            <FormButton variant="outline" size="sm" width="100%">
              Export All Projects
            </FormButton>
            <FormButton variant="outline" size="sm" width="100%">
              Writing Statistics
            </FormButton>
          </VStack>
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
