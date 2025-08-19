'use client';

import React, { useState, useMemo } from 'react';
import { Box, VStack, HStack, Text, IconButton, Badge, Tabs, Separator } from '@chakra-ui/react';
import { FaTimes, FaTag, FaClock, FaChartLine, FaLink, FaEye, FaEyeSlash } from 'react-icons/fa';

interface ProjectInfoPanelProps {
  projectId: string;
  onClose?: () => void;
  isMobile?: boolean;
}

export default function ProjectInfoPanel({
  projectId: _projectId, // eslint-disable-line @typescript-eslint/no-unused-vars
  onClose,
  isMobile,
}: ProjectInfoPanelProps) {
  // _projectId will be used for API calls in future phases
  const [activeTab, setActiveTab] = useState('metadata');

  // Mock data for the current document - memoized for performance
  const currentDocument = useMemo(
    () => ({
      title: 'Aria Moonwhisper',
      category: 'Characters',
      wordCount: 1250,
      lastModified: '2 hours ago',
      createdAt: 'Dec 15, 2024',
      tags: ['protagonist', 'mage', 'noble'],
      knownBy: ['Lord Blackthorne', 'Zephyr', 'Queen Elara'],
      unknownBy: ['The Shadow Council', 'Village Folk'],
      relatedDocs: [
        { id: '1', title: 'Crystal Peaks', type: 'location' },
        { id: '2', title: 'Elemental Magic System', type: 'magic' },
        { id: '3', title: 'The Great War', type: 'history' },
      ],
    }),
    []
  );

  // Mock progress data - memoized for performance
  const progressData = useMemo(
    () => ({
      todayWords: 856,
      todayGoal: 1000,
      weeklyWords: 4230,
      weeklyGoal: 7000,
      overallCompletion: 45,
    }),
    []
  );

  return (
    <VStack h="100%" align="stretch" gap="0" bg="bg.default">
      {/* Header */}
      <HStack p="3" borderBottomWidth="1px" borderColor="border.default" bg="bg.default">
        <Text fontSize="sm" fontWeight="semibold" flex="1">
          Document Info
        </Text>
        {isMobile && (
          <IconButton onClick={onClose} variant="ghost" size="sm" aria-label="Close info panel">
            <FaTimes />
          </IconButton>
        )}
      </HStack>

      {/* Tabs */}
      <Tabs.Root
        value={activeTab}
        onValueChange={(details) => setActiveTab(details.value)}
        size="sm"
      >
        <Tabs.List px="3">
          <Tabs.Trigger value="metadata" flex="1">
            Metadata
          </Tabs.Trigger>
          <Tabs.Trigger value="knowledge" flex="1">
            Knowledge
          </Tabs.Trigger>
          <Tabs.Trigger value="progress" flex="1">
            Progress
          </Tabs.Trigger>
        </Tabs.List>

        <Box flex="1" overflowY="auto">
          {/* Metadata Tab */}
          <Tabs.Content value="metadata">
            <VStack align="stretch" p="3" gap="4">
              {/* Document Title */}
              <Box>
                <Text fontSize="lg" fontWeight="semibold" mb="1">
                  {currentDocument.title}
                </Text>
                <Badge colorScheme="secondary" size="sm">
                  {currentDocument.category}
                </Badge>
              </Box>

              {/* Stats */}
              <VStack align="stretch" gap="2">
                <HStack justify="space-between">
                  <HStack gap="1" color="fg.muted">
                    <FaClock fontSize="12px" />
                    <Text fontSize="xs">Modified</Text>
                  </HStack>
                  <Text fontSize="xs">{currentDocument.lastModified}</Text>
                </HStack>
                <HStack justify="space-between">
                  <HStack gap="1" color="fg.muted">
                    <FaClock fontSize="12px" />
                    <Text fontSize="xs">Created</Text>
                  </HStack>
                  <Text fontSize="xs">{currentDocument.createdAt}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="xs" color="fg.muted">
                    Word Count
                  </Text>
                  <Text fontSize="xs" fontWeight="semibold">
                    {currentDocument.wordCount.toLocaleString()}
                  </Text>
                </HStack>
              </VStack>

              <Separator />

              {/* Tags */}
              <Box>
                <HStack mb="2">
                  <FaTag fontSize="12px" color="var(--chakra-colors-fg-muted)" />
                  <Text fontSize="xs" fontWeight="semibold">
                    Tags
                  </Text>
                </HStack>
                <HStack flexWrap="wrap" gap="1">
                  {currentDocument.tags.map((tag) => (
                    <Badge key={tag} size="sm" variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </HStack>
              </Box>

              <Separator />

              {/* Related Documents */}
              <Box>
                <HStack mb="2">
                  <FaLink fontSize="12px" color="var(--chakra-colors-fg-muted)" />
                  <Text fontSize="xs" fontWeight="semibold">
                    Related Documents
                  </Text>
                </HStack>
                <VStack align="stretch" gap="1">
                  {currentDocument.relatedDocs.map((doc) => (
                    <HStack
                      key={doc.id}
                      p="2"
                      borderRadius="md"
                      bg="bg.subtle"
                      cursor="pointer"
                      _hover={{ bg: 'bg.muted' }}
                    >
                      <Text fontSize="xs" flex="1">
                        {doc.title}
                      </Text>
                      <Badge size="xs" variant="subtle">
                        {doc.type}
                      </Badge>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            </VStack>
          </Tabs.Content>

          {/* Knowledge Tab */}
          <Tabs.Content value="knowledge">
            <VStack align="stretch" p="3" gap="4">
              {/* Known By */}
              <Box>
                <HStack mb="2">
                  <FaEye fontSize="12px" color="var(--chakra-colors-success-500)" />
                  <Text fontSize="xs" fontWeight="semibold">
                    Known By
                  </Text>
                </HStack>
                <VStack align="stretch" gap="1">
                  {currentDocument.knownBy.map((character) => (
                    <HStack
                      key={character}
                      p="2"
                      borderRadius="md"
                      bg="bg.subtle"
                      borderLeftWidth="3px"
                      borderLeftColor="success.500"
                    >
                      <Text fontSize="xs">{character}</Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>

              <Separator />

              {/* Unknown By */}
              <Box>
                <HStack mb="2">
                  <FaEyeSlash fontSize="12px" color="var(--chakra-colors-error-500)" />
                  <Text fontSize="xs" fontWeight="semibold">
                    Unknown By
                  </Text>
                </HStack>
                <VStack align="stretch" gap="1">
                  {currentDocument.unknownBy.map((character) => (
                    <HStack
                      key={character}
                      p="2"
                      borderRadius="md"
                      bg="bg.subtle"
                      borderLeftWidth="3px"
                      borderLeftColor="error.500"
                    >
                      <Text fontSize="xs">{character}</Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>

              <Separator />

              {/* Quick Actions */}
              <Box>
                <Text fontSize="xs" fontWeight="semibold" mb="2">
                  Quick Actions
                </Text>
                <VStack align="stretch" gap="2">
                  <Box
                    as="button"
                    p="2"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="border.default"
                    fontSize="xs"
                    textAlign="left"
                    _hover={{ bg: 'bg.subtle' }}
                  >
                    Edit Character Knowledge
                  </Box>
                  <Box
                    as="button"
                    p="2"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="border.default"
                    fontSize="xs"
                    textAlign="left"
                    _hover={{ bg: 'bg.subtle' }}
                  >
                    View Knowledge Matrix
                  </Box>
                </VStack>
              </Box>
            </VStack>
          </Tabs.Content>

          {/* Progress Tab */}
          <Tabs.Content value="progress">
            <VStack align="stretch" p="3" gap="4">
              {/* Today's Progress */}
              <Box>
                <HStack justify="space-between" mb="2">
                  <Text fontSize="xs" fontWeight="semibold">
                    Today&apos;s Progress
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {progressData.todayWords} / {progressData.todayGoal}
                  </Text>
                </HStack>
                <Box bg="bg.subtle" height="2" borderRadius="full" overflow="hidden">
                  <Box
                    bg="brand.500"
                    height="100%"
                    width={`${(progressData.todayWords / progressData.todayGoal) * 100}%`}
                    transition="width 0.3s"
                  />
                </Box>
              </Box>

              {/* Weekly Progress */}
              <Box>
                <HStack justify="space-between" mb="2">
                  <Text fontSize="xs" fontWeight="semibold">
                    Weekly Progress
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {progressData.weeklyWords} / {progressData.weeklyGoal}
                  </Text>
                </HStack>
                <Box bg="bg.subtle" height="2" borderRadius="full" overflow="hidden">
                  <Box
                    bg="secondary.500"
                    height="100%"
                    width={`${(progressData.weeklyWords / progressData.weeklyGoal) * 100}%`}
                    transition="width 0.3s"
                  />
                </Box>
              </Box>

              {/* Overall Completion */}
              <Box>
                <HStack justify="space-between" mb="2">
                  <Text fontSize="xs" fontWeight="semibold">
                    Project Completion
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {progressData.overallCompletion}%
                  </Text>
                </HStack>
                <Box bg="bg.subtle" height="2" borderRadius="full" overflow="hidden">
                  <Box
                    bg="accent.500"
                    height="100%"
                    width={`${progressData.overallCompletion}%`}
                    transition="width 0.3s"
                  />
                </Box>
              </Box>

              <Separator />

              {/* Writing Stats */}
              <Box>
                <HStack mb="2">
                  <FaChartLine fontSize="12px" color="var(--chakra-colors-fg-muted)" />
                  <Text fontSize="xs" fontWeight="semibold">
                    Writing Stats
                  </Text>
                </HStack>
                <VStack align="stretch" gap="2">
                  <HStack justify="space-between">
                    <Text fontSize="xs" color="fg.muted">
                      Average per day
                    </Text>
                    <Text fontSize="xs">604 words</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="xs" color="fg.muted">
                      Best day
                    </Text>
                    <Text fontSize="xs">1,450 words</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="xs" color="fg.muted">
                      Writing streak
                    </Text>
                    <Text fontSize="xs">7 days</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="xs" color="fg.muted">
                      Est. completion
                    </Text>
                    <Text fontSize="xs">March 15, 2025</Text>
                  </HStack>
                </VStack>
              </Box>

              <Separator />

              {/* Quick Actions */}
              <Box>
                <Text fontSize="xs" fontWeight="semibold" mb="2">
                  Actions
                </Text>
                <VStack align="stretch" gap="2">
                  <Box
                    as="button"
                    p="2"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="border.default"
                    fontSize="xs"
                    textAlign="left"
                    _hover={{ bg: 'bg.subtle' }}
                  >
                    View Detailed Analytics
                  </Box>
                  <Box
                    as="button"
                    p="2"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="border.default"
                    fontSize="xs"
                    textAlign="left"
                    _hover={{ bg: 'bg.subtle' }}
                  >
                    Export Progress Report
                  </Box>
                </VStack>
              </Box>
            </VStack>
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </VStack>
  );
}
