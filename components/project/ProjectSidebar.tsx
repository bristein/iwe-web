'use client';

import React, { useState, useMemo } from 'react';
import { Box, VStack, HStack, Text, IconButton, Input, Collapsible } from '@chakra-ui/react';
import {
  FaBook,
  FaFeatherAlt,
  FaSearch,
  FaTimes,
  FaChevronRight,
  FaChevronDown,
  FaUser,
  FaMapMarkedAlt,
  FaMagic,
  FaHistory,
  FaHeart,
  FaFolder,
  FaPlus,
  FaFileAlt,
  FaPenFancy,
} from 'react-icons/fa';

interface ProjectSidebarProps {
  projectId: string;
  onClose?: () => void;
  isMobile?: boolean;
}

interface TreeNode {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  count?: number;
  status?: 'outline' | 'draft' | 'complete';
}

export default function ProjectSidebar({
  projectId: _projectId, // eslint-disable-line @typescript-eslint/no-unused-vars
  onClose,
  isMobile,
}: ProjectSidebarProps) {
  // _projectId will be used for API calls in future phases
  const [searchQuery, setSearchQuery] = useState('');
  const [worldBibleExpanded, setWorldBibleExpanded] = useState(true);
  const [manuscriptExpanded, setManuscriptExpanded] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Mock data for world bible categories - memoized for performance
  const worldBibleCategories: TreeNode[] = useMemo(
    () => [
      {
        id: 'characters',
        title: 'Characters',
        icon: <FaUser />,
        count: 12,
        children: [
          { id: 'char-1', title: 'Aria Moonwhisper' },
          { id: 'char-2', title: 'Lord Blackthorne' },
          { id: 'char-3', title: 'Zephyr the Swift' },
        ],
      },
      {
        id: 'locations',
        title: 'Locations',
        icon: <FaMapMarkedAlt />,
        count: 8,
        children: [
          { id: 'loc-1', title: 'Crystal Peaks' },
          { id: 'loc-2', title: 'Shadowmere Forest' },
          { id: 'loc-3', title: 'The Floating Citadel' },
        ],
      },
      {
        id: 'magic',
        title: 'Magic & Technology',
        icon: <FaMagic />,
        count: 15,
        children: [
          { id: 'magic-1', title: 'Elemental Magic System' },
          { id: 'magic-2', title: 'Ancient Artifacts' },
          { id: 'magic-3', title: 'Magitech Devices' },
        ],
      },
      {
        id: 'history',
        title: 'History',
        icon: <FaHistory />,
        count: 6,
        children: [
          { id: 'hist-1', title: 'The Great War' },
          { id: 'hist-2', title: 'Age of Dragons' },
          { id: 'hist-3', title: 'The Sundering' },
        ],
      },
      {
        id: 'relationships',
        title: 'Relationships',
        icon: <FaHeart />,
        count: 10,
        children: [
          { id: 'rel-1', title: 'Political Alliances' },
          { id: 'rel-2', title: 'Family Trees' },
          { id: 'rel-3', title: 'Romantic Connections' },
        ],
      },
      {
        id: 'other',
        title: 'Other',
        icon: <FaFolder />,
        count: 4,
        children: [
          { id: 'other-1', title: 'Languages' },
          { id: 'other-2', title: 'Currency & Trade' },
        ],
      },
    ],
    []
  );

  // Mock data for manuscript structure - memoized for performance
  const manuscriptStructure: TreeNode[] = useMemo(
    () => [
      {
        id: 'ch-1',
        title: 'Chapter 1: The Beginning',
        icon: <FaFileAlt />,
        status: 'complete',
        children: [
          { id: 'ch-1-sc-1', title: 'Scene 1: Awakening', status: 'complete' },
          { id: 'ch-1-sc-2', title: 'Scene 2: The Message', status: 'complete' },
        ],
      },
      {
        id: 'ch-2',
        title: 'Chapter 2: The Journey',
        icon: <FaFileAlt />,
        status: 'draft',
        children: [
          { id: 'ch-2-sc-1', title: 'Scene 1: Departure', status: 'complete' },
          { id: 'ch-2-sc-2', title: 'Scene 2: First Encounter', status: 'draft' },
          { id: 'ch-2-sc-3', title: 'Scene 3: The Inn', status: 'outline' },
        ],
      },
      {
        id: 'ch-3',
        title: 'Chapter 3: Revelations',
        icon: <FaFileAlt />,
        status: 'outline',
        children: [
          { id: 'ch-3-sc-1', title: 'Scene 1: The Truth', status: 'outline' },
          { id: 'ch-3-sc-2', title: 'Scene 2: Betrayal', status: 'outline' },
        ],
      },
    ],
    []
  );

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'complete':
        return 'success.500';
      case 'draft':
        return 'brand.500';
      case 'outline':
        return 'neutral.400';
      default:
        return 'fg.muted';
    }
  };

  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedCategories.has(node.id);

    return (
      <Box key={node.id}>
        <HStack
          role="treeitem"
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-level={level + 1}
          aria-selected={false}
          aria-label={`${node.title}${node.count ? `, ${node.count} items` : ''}`}
          aria-describedby={node.status ? `${node.id}-status` : undefined}
          tabIndex={0}
          px="3"
          py="1.5"
          pl={`${12 + level * 16}px`}
          cursor="pointer"
          _hover={{ bg: 'bg.subtle' }}
          _focus={{ outline: '2px solid', outlineColor: 'brand.500', outlineOffset: '-2px' }}
          onClick={() => hasChildren && toggleCategory(node.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (hasChildren) {
                toggleCategory(node.id);
              }
            } else if (e.key === 'ArrowRight' && hasChildren && !isExpanded) {
              toggleCategory(node.id);
            } else if (e.key === 'ArrowLeft' && hasChildren && isExpanded) {
              toggleCategory(node.id);
            }
          }}
          gap="2"
        >
          {hasChildren && (
            <Box color="fg.muted" fontSize="xs">
              {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
            </Box>
          )}
          {!hasChildren && <Box width="12px" />}
          {node.icon && (
            <Box color={getStatusColor(node.status)} fontSize="sm">
              {node.status === 'draft' ? <FaPenFancy /> : node.icon}
            </Box>
          )}
          <Text fontSize="sm" flex="1" color="fg.default">
            {node.title}
          </Text>
          {node.count !== undefined && (
            <Text fontSize="xs" color="fg.muted" id={`${node.id}-count`}>
              {node.count}
            </Text>
          )}
          {node.status && (
            <Text id={`${node.id}-status`} position="absolute" left="-9999px">
              Status: {node.status}
            </Text>
          )}
        </HStack>
        {hasChildren && (
          <Collapsible.Root open={isExpanded}>
            <Collapsible.Content>
              {node.children!.map((child) => renderTreeNode(child, level + 1))}
            </Collapsible.Content>
          </Collapsible.Root>
        )}
      </Box>
    );
  };

  return (
    <VStack h="100%" align="stretch" gap="0" bg="bg.default">
      {/* Search Bar */}
      <Box p="3" borderBottomWidth="1px" borderColor="border.default" bg="bg.default">
        <HStack>
          <Box position="relative" flex="1">
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="sm"
              pl="8"
            />
            <Box
              position="absolute"
              left="2"
              top="50%"
              transform="translateY(-50%)"
              color="fg.muted"
            >
              <FaSearch />
            </Box>
          </Box>
          {isMobile && (
            <IconButton onClick={onClose} variant="ghost" size="sm" aria-label="Close sidebar">
              <FaTimes />
            </IconButton>
          )}
        </HStack>
      </Box>

      {/* Navigation Trees */}
      <Box
        flex="1"
        overflowY="auto"
        role="tree"
        aria-label="Project navigation"
        onKeyDown={(e) => {
          // Add arrow key navigation
          if (e.key === 'ArrowDown') {
            const current = e.target as HTMLElement;
            const next = current.nextElementSibling as HTMLElement;
            if (next && next.getAttribute('role') === 'treeitem') {
              next.focus();
            }
          } else if (e.key === 'ArrowUp') {
            const current = e.target as HTMLElement;
            const prev = current.previousElementSibling as HTMLElement;
            if (prev && prev.getAttribute('role') === 'treeitem') {
              prev.focus();
            }
          }
        }}
      >
        {/* World Bible Section */}
        <Box role="group" aria-label="World Bible">
          <HStack
            px="3"
            py="2"
            cursor="pointer"
            onClick={() => setWorldBibleExpanded(!worldBibleExpanded)}
            borderBottomWidth="1px"
            borderColor="border.default"
            bg="bg.subtle"
          >
            <Box color="secondary.500">
              <FaBook />
            </Box>
            <Text fontSize="sm" fontWeight="semibold" flex="1">
              World Bible
            </Text>
            <IconButton
              variant="ghost"
              size="xs"
              aria-label="Add to world bible"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Open create modal
              }}
            >
              <FaPlus />
            </IconButton>
            <Box color="fg.muted" fontSize="xs">
              {worldBibleExpanded ? <FaChevronDown /> : <FaChevronRight />}
            </Box>
          </HStack>
          <Collapsible.Root open={worldBibleExpanded}>
            <Collapsible.Content>
              {worldBibleCategories.map((category) => renderTreeNode(category))}
            </Collapsible.Content>
          </Collapsible.Root>
        </Box>

        {/* Manuscript Section */}
        <Box role="group" aria-label="Manuscript">
          <HStack
            px="3"
            py="2"
            cursor="pointer"
            onClick={() => setManuscriptExpanded(!manuscriptExpanded)}
            borderBottomWidth="1px"
            borderColor="border.default"
            bg="bg.subtle"
          >
            <Box color="brand.500">
              <FaFeatherAlt />
            </Box>
            <Text fontSize="sm" fontWeight="semibold" flex="1">
              Manuscript
            </Text>
            <IconButton
              variant="ghost"
              size="xs"
              aria-label="Add chapter"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Open create modal
              }}
            >
              <FaPlus />
            </IconButton>
            <Box color="fg.muted" fontSize="xs">
              {manuscriptExpanded ? <FaChevronDown /> : <FaChevronRight />}
            </Box>
          </HStack>
          <Collapsible.Root open={manuscriptExpanded}>
            <Collapsible.Content>
              {manuscriptStructure.map((chapter) => renderTreeNode(chapter))}
            </Collapsible.Content>
          </Collapsible.Root>
        </Box>
      </Box>

      {/* Quick Stats */}
      <Box p="3" borderTopWidth="1px" borderColor="border.default">
        <VStack align="stretch" gap="1">
          <HStack justify="space-between">
            <Text fontSize="xs" color="fg.muted">
              Documents
            </Text>
            <Text fontSize="xs" fontWeight="semibold">
              55
            </Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="xs" color="fg.muted">
              Chapters
            </Text>
            <Text fontSize="xs" fontWeight="semibold">
              12 / 25
            </Text>
          </HStack>
        </VStack>
      </Box>
    </VStack>
  );
}
