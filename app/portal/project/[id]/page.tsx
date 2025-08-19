'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  IconButton,
  Button,
  Spinner,
  Center,
  Alert,
  Badge,
} from '@chakra-ui/react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { FaChevronLeft, FaBars, FaInfoCircle, FaTimes, FaCog } from 'react-icons/fa';
import { Project } from '@/lib/models/project';
import ProjectSidebar from '@/components/project/ProjectSidebar';
import ProjectInfoPanel from '@/components/project/ProjectInfoPanel';
import DocumentTabs from '@/components/project/DocumentTabs';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const {} = useAuth(); // User authenticated via middleware
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Memoized check mobile function to prevent stale closures
  const checkMobile = useCallback(() => {
    const width = window.innerWidth;
    setIsMobile(width < 768);
    if (width < 1024) {
      setRightPanelOpen(false);
    }
    if (width < 768) {
      setLeftSidebarOpen(false);
    }
  }, []);

  // Check for mobile viewport with throttling
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const throttledCheck = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, 150);
    };

    throttledCheck(); // Initial check
    window.addEventListener('resize', throttledCheck);

    return () => {
      window.removeEventListener('resize', throttledCheck);
      clearTimeout(timeoutId);
    };
  }, [checkMobile]);

  // Fetch project data
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(
              'Project not found. It may have been deleted or you may not have access to it.'
            );
          }
          if (response.status === 403) {
            throw new Error('Access denied. You do not have permission to view this project.');
          }
          if (response.status === 401) {
            throw new Error('Your session has expired. Please log in again.');
          }
          throw new Error(`Failed to fetch project: ${response.statusText}`);
        }

        const data = await response.json();
        setProject(data);
      } catch (err) {
        console.error('Error fetching project:', err);
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const handleBackToProjects = () => {
    router.push('/portal');
  };

  if (loading) {
    return (
      <Center h="100vh" w="100vw" position="fixed" top="0" left="0" bg="bg.canvas">
        <VStack gap="4">
          <Spinner size="lg" color="brand.600" />
          <Text color="fg.muted">Loading project...</Text>
        </VStack>
      </Center>
    );
  }

  if (error) {
    const isAuthError = error.includes('session has expired');
    const isNotFound = error.includes('not found');
    const isAccessDenied = error.includes('Access denied');

    return (
      <Box
        h="100vh"
        w="100vw"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="bg.canvas"
        position="fixed"
        top="0"
        left="0"
      >
        <Box maxW="2xl" w="full" px="6">
          <VStack gap="6" align="stretch">
            <Alert.Root status={isAuthError ? 'warning' : 'error'} borderRadius="xl">
              <Alert.Indicator />
              <Box flex="1">
                <Alert.Title>
                  {isAuthError && 'Session Expired'}
                  {isNotFound && 'Project Not Found'}
                  {isAccessDenied && 'Access Denied'}
                  {!isAuthError && !isNotFound && !isAccessDenied && 'Error Loading Project'}
                </Alert.Title>
                <Alert.Description>{error}</Alert.Description>
              </Box>
            </Alert.Root>
            <HStack gap="3">
              {isAuthError ? (
                <Button onClick={() => router.push('/login')} variant="solid" colorScheme="brand">
                  Log In Again
                </Button>
              ) : (
                <>
                  <IconButton
                    onClick={handleBackToProjects}
                    variant="outline"
                    aria-label="Back to projects"
                  >
                    <FaChevronLeft />
                  </IconButton>
                  <Text>Back to Projects</Text>
                </>
              )}
            </HStack>
          </VStack>
        </Box>
      </Box>
    );
  }

  const mockProject = project || {
    _id: projectId,
    title: 'The Chronicles of Aetheria',
    genre: 'Fantasy',
    status: 'drafting' as const,
    wordCount: 45230,
    wordCountGoal: 100000,
  };

  return (
    <Box
      h="100vh"
      w="100vw"
      display="flex"
      flexDirection="column"
      bg="bg.canvas"
      position="fixed"
      top="0"
      left="0"
    >
      {/* Header */}
      <Box
        borderBottomWidth="1px"
        borderColor="border.default"
        bg="bg.default"
        px="4"
        py="2"
        shadow="sm"
        position="relative"
        zIndex="20"
      >
        <HStack justify="space-between" h="12">
          {/* Left Section */}
          <HStack gap="4">
            {/* Close Project Button */}
            <Button onClick={handleBackToProjects} variant="ghost" size="sm">
              <FaTimes />
              Close Project
            </Button>
            {/* Mobile menu button */}
            {isMobile && (
              <IconButton
                onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                variant="ghost"
                aria-label="Toggle menu"
                size="sm"
              >
                <FaBars />
              </IconButton>
            )}
          </HStack>

          {/* Center Section - Project Title */}
          <HStack gap="3" position="absolute" left="50%" transform="translateX(-50%)">
            <Text fontSize="lg" fontWeight="semibold" color="fg.default">
              {mockProject.title}
            </Text>
            <HStack gap="2" display={{ base: 'none', lg: 'flex' }}>
              <Badge colorScheme="purple" size="sm">
                {mockProject.genre}
              </Badge>
              <Badge colorScheme="blue" size="sm">
                {mockProject.status}
              </Badge>
            </HStack>
          </HStack>

          {/* Right Section */}
          <HStack gap="2">
            <Text fontSize="sm" color="fg.muted" display={{ base: 'none', md: 'block' }}>
              {mockProject.wordCount?.toLocaleString()} /{' '}
              {mockProject.wordCountGoal?.toLocaleString()} words
            </Text>

            <IconButton
              onClick={() => console.log('Open settings')}
              variant="ghost"
              aria-label="Project settings"
              size="sm"
            >
              <FaCog />
            </IconButton>
            <IconButton
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              variant="ghost"
              aria-label={rightPanelOpen ? 'Close info panel' : 'Open info panel'}
              aria-pressed={rightPanelOpen}
              size="sm"
            >
              <FaInfoCircle />
            </IconButton>
          </HStack>
        </HStack>
      </Box>

      {/* Main Content Area */}
      <Box flex="1" display="flex" overflow="hidden">
        {/* Left Sidebar */}
        <Box
          width={leftSidebarOpen ? { base: '100%', md: '250px', lg: '280px' } : '0'}
          flexShrink="0"
          borderRightWidth={leftSidebarOpen ? '1px' : '0'}
          borderColor="border.default"
          bg="bg.default"
          overflow="hidden"
          transition="width 0.2s"
          position={{ base: 'absolute', md: 'relative' }}
          height="100%"
          zIndex={{ base: 10, md: 1 }}
          shadow={{ base: leftSidebarOpen ? 'xl' : 'none', md: 'none' }}
        >
          {leftSidebarOpen && (
            <ErrorBoundary level="section" isolate>
              <ProjectSidebar
                projectId={projectId}
                onClose={() => setLeftSidebarOpen(false)}
                isMobile={isMobile}
              />
            </ErrorBoundary>
          )}
        </Box>

        {/* Main Content */}
        <Box flex="1" display="flex" flexDirection="column" overflow="hidden">
          <ErrorBoundary level="section" isolate>
            <DocumentTabs projectId={projectId} />
          </ErrorBoundary>
        </Box>

        {/* Right Info Panel */}
        <Box
          width={rightPanelOpen ? { base: '100%', md: '250px', lg: '300px' } : '0'}
          flexShrink="0"
          borderLeftWidth={rightPanelOpen ? '1px' : '0'}
          borderColor="border.default"
          bg="bg.default"
          overflow="hidden"
          transition="width 0.2s"
          position={{ base: 'absolute', md: 'relative' }}
          right="0"
          height="100%"
          zIndex={{ base: 10, md: 1 }}
          shadow={{ base: rightPanelOpen ? 'xl' : 'none', md: 'none' }}
        >
          {rightPanelOpen && (
            <ErrorBoundary level="section" isolate>
              <ProjectInfoPanel
                projectId={projectId}
                onClose={() => setRightPanelOpen(false)}
                isMobile={isMobile}
              />
            </ErrorBoundary>
          )}
        </Box>
      </Box>
    </Box>
  );
}
