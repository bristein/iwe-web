'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Badge,
  Collapsible,
  useDisclosure,
  Menu,
  Progress,
  Button,
  Tabs,
} from '@chakra-ui/react';
import {
  FiChevronDown,
  FiChevronRight,
  FiBook,
  FiFileText,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiMoreVertical,
  FiCheckCircle,
  FiCircle,
  FiClock,
  FiMaximize2,
  FiMinimize2,
  FiList,
  FiCalendar,
} from 'react-icons/fi';

type SectionStatus = 'outline' | 'draft' | 'revision' | 'complete';
type SectionType = 'book' | 'part' | 'chapter' | 'scene';

interface ManuscriptSection {
  id: string;
  type: SectionType;
  title: string;
  description?: string;
  status: SectionStatus;
  parentId?: string;
  order: number;
  wordCount: number;
  targetWordCount?: number;
  outline?: string;
  content?: string;
  lastModified: Date;
  children?: ManuscriptSection[];
}

interface ManuscriptTreeProps {
  sections: ManuscriptSection[];
  selectedSectionId?: string;
  onSelectSection: (sectionId: string) => void;
  onCreateSection?: (parentId?: string, type?: SectionType) => void;
  onEditSection?: (sectionId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  onMoveSection?: (sectionId: string, newParentId?: string, newOrder?: number) => void;
  onStatusChange?: (sectionId: string, newStatus: SectionStatus) => void;
  viewMode?: 'tree' | 'timeline';
}

const ItemTypes = {
  SECTION: 'section',
};

const statusColors: Record<SectionStatus, string> = {
  outline: 'gray',
  draft: 'blue',
  revision: 'yellow',
  complete: 'green',
};

const statusIcons: Record<SectionStatus, React.ReactNode> = {
  outline: <FiCircle />,
  draft: <FiEdit2 />,
  revision: <FiClock />,
  complete: <FiCheckCircle />,
};

const SectionNode: React.FC<{
  section: ManuscriptSection;
  isSelected: boolean;
  onSelect: () => void;
  onContextMenu: (action: string) => void;
  onStatusChange?: (newStatus: SectionStatus) => void;
  onMoveSection?: (sectionId: string, newParentId?: string, newOrder?: number) => void;
  level: number;
}> = ({ section, isSelected, onSelect, onContextMenu, onStatusChange, onMoveSection, level }) => {
  const { open: isOpen, onToggle } = useDisclosure({ defaultOpen: level < 2 });
  const hasChildren = section.children && section.children.length > 0;
  const progress = section.targetWordCount
    ? (section.wordCount / section.targetWordCount) * 100
    : 0;

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.SECTION,
    item: { id: section.id, parentId: section.parentId, order: section.order },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.SECTION,
    drop: (item: { id: string; parentId?: string; order: number }) => {
      if (onMoveSection && item.id !== section.id) {
        onMoveSection(item.id, section.id, 0);
      }
    },
    canDrop: (item) => item.id !== section.id && section.type !== 'scene',
    collect: (monitor) => ({
      isOver: monitor.isOver() && monitor.canDrop(),
    }),
  });

  const nodeRef = (node: HTMLDivElement) => {
    drag(drop(node));
  };

  return (
    <Box ml={level * 4}>
      <HStack
        ref={nodeRef}
        p={2}
        borderRadius="md"
        bg={isSelected ? 'colorPalette.subtle' : isOver ? 'bg.muted' : undefined}
        _hover={{ bg: 'bg.subtle' }}
        cursor="pointer"
        opacity={isDragging ? 0.5 : 1}
        onClick={onSelect}
      >
        {hasChildren && (
          <IconButton
            size="xs"
            variant="ghost"
            aria-label="Toggle section"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {isOpen ? <FiChevronDown /> : <FiChevronRight />}
          </IconButton>
        )}
        {!hasChildren && <Box width="20px" />}

        {section.type === 'book' && <FiBook />}
        {section.type === 'chapter' && <FiFileText />}
        {section.type === 'scene' && <FiFileText />}

        <VStack align="start" flex={1} gap={0}>
          <HStack>
            <Text fontSize="sm" fontWeight={section.type === 'chapter' ? 'medium' : 'normal'}>
              {section.title}
            </Text>
            <Badge size="xs" colorPalette={statusColors[section.status]}>
              {statusIcons[section.status]}
              {section.status}
            </Badge>
          </HStack>
          {section.description && (
            <Text fontSize="xs" color="fg.muted" lineClamp={1}>
              {section.description}
            </Text>
          )}
        </VStack>

        <VStack align="end" gap={0}>
          <Text fontSize="xs" color="fg.muted">
            {section.wordCount.toLocaleString()} words
          </Text>
          {section.targetWordCount && (
            <Progress.Root width="60px" height="4px" value={progress}>
              <Progress.Range />
            </Progress.Root>
          )}
        </VStack>

        <Menu.Root>
          <Menu.Trigger asChild>
            <IconButton
              size="xs"
              variant="ghost"
              aria-label="Section options"
              onClick={(e) => e.stopPropagation()}
            >
              <FiMoreVertical />
            </IconButton>
          </Menu.Trigger>
          <Menu.Positioner>
            <Menu.Content>
              {section.type !== 'scene' && (
                <Menu.Item value="create" onSelect={() => onContextMenu('create')}>
                  <FiPlus /> Add {section.type === 'book' ? 'Chapter' : 'Scene'}
                </Menu.Item>
              )}
              <Menu.Item value="edit" onSelect={() => onContextMenu('edit')}>
                <FiEdit2 /> Edit
              </Menu.Item>
              {onStatusChange && (
                <Menu.Item value="status">
                  <FiCircle /> Change Status
                </Menu.Item>
              )}
              <Menu.Item value="delete" onSelect={() => onContextMenu('delete')}>
                <FiTrash2 /> Delete
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Menu.Root>
      </HStack>

      {hasChildren && (
        <Collapsible.Root open={isOpen}>
          <Collapsible.Content>
            <VStack align="stretch" gap={1} mt={1}>
              {section.children!.map((child) => (
                <SectionNode
                  key={child.id}
                  section={child}
                  isSelected={false}
                  onSelect={() => {}}
                  onContextMenu={() => {}}
                  onStatusChange={onStatusChange}
                  onMoveSection={onMoveSection}
                  level={level + 1}
                />
              ))}
            </VStack>
          </Collapsible.Content>
        </Collapsible.Root>
      )}
    </Box>
  );
};

const TimelineView: React.FC<{
  sections: ManuscriptSection[];
  selectedSectionId?: string;
  onSelectSection: (sectionId: string) => void;
}> = ({ sections, selectedSectionId, onSelectSection }) => {
  const flatSections = useMemo(() => {
    const flatten = (sections: ManuscriptSection[]): ManuscriptSection[] => {
      return sections.reduce((acc, section) => {
        acc.push(section);
        if (section.children) {
          acc.push(...flatten(section.children));
        }
        return acc;
      }, [] as ManuscriptSection[]);
    };
    return flatten(sections).filter((s) => s.type === 'chapter' || s.type === 'scene');
  }, [sections]);

  return (
    <VStack align="stretch" p={4}>
      {flatSections.map((section, index) => (
        <HStack key={section.id} align="start">
          <VStack>
            <Box
              width="12px"
              height="12px"
              borderRadius="full"
              bg={statusColors[section.status] + '.500'}
            />
            {index < flatSections.length - 1 && <Box width="2px" height="40px" bg="border" />}
          </VStack>
          <Box
            flex={1}
            p={3}
            borderRadius="md"
            border="1px solid"
            borderColor={selectedSectionId === section.id ? 'colorPalette.500' : 'border'}
            bg={selectedSectionId === section.id ? 'colorPalette.subtle' : 'bg'}
            cursor="pointer"
            onClick={() => onSelectSection(section.id)}
            _hover={{ bg: 'bg.subtle' }}
          >
            <HStack justify="space-between">
              <Text fontWeight="medium">{section.title}</Text>
              <Badge size="sm" colorPalette={statusColors[section.status]}>
                {section.status}
              </Badge>
            </HStack>
            {section.description && (
              <Text fontSize="sm" color="fg.muted" mt={1}>
                {section.description}
              </Text>
            )}
            <Text fontSize="xs" color="fg.muted" mt={2}>
              {section.wordCount.toLocaleString()} words
            </Text>
          </Box>
        </HStack>
      ))}
    </VStack>
  );
};

export const ManuscriptTree: React.FC<ManuscriptTreeProps> = ({
  sections,
  selectedSectionId,
  onSelectSection,
  onCreateSection,
  onEditSection,
  onDeleteSection,
  onMoveSection,
  onStatusChange,
  viewMode = 'tree',
}) => {
  const [expandAll, setExpandAll] = useState(false);
  const [currentView, setCurrentView] = useState(viewMode);

  const totalWords = useMemo(() => {
    const countWords = (sections: ManuscriptSection[]): number => {
      return sections.reduce((total, section) => {
        let count = section.wordCount;
        if (section.children) {
          count += countWords(section.children);
        }
        return total + count;
      }, 0);
    };
    return countWords(sections);
  }, [sections]);

  const completionStats = useMemo(() => {
    const countByStatus = (sections: ManuscriptSection[]): Record<SectionStatus, number> => {
      const counts: Record<SectionStatus, number> = {
        outline: 0,
        draft: 0,
        revision: 0,
        complete: 0,
      };

      const count = (sections: ManuscriptSection[]) => {
        sections.forEach((section) => {
          if (section.type === 'chapter' || section.type === 'scene') {
            counts[section.status]++;
          }
          if (section.children) {
            count(section.children);
          }
        });
      };

      count(sections);
      return counts;
    };
    return countByStatus(sections);
  }, [sections]);

  const totalSections = Object.values(completionStats).reduce((a, b) => a + b, 0);
  const completionPercentage =
    totalSections > 0 ? (completionStats.complete / totalSections) * 100 : 0;

  const handleContextMenu = useCallback(
    (sectionId: string, action: string) => {
      switch (action) {
        case 'create':
          onCreateSection?.(sectionId);
          break;
        case 'edit':
          onEditSection?.(sectionId);
          break;
        case 'delete':
          onDeleteSection?.(sectionId);
          break;
      }
    },
    [onCreateSection, onEditSection, onDeleteSection]
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <VStack align="stretch" height="100%" gap={0}>
        <Box p={3} borderBottom="1px solid" borderColor="border">
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="medium">Manuscript Structure</Text>
            <HStack>
              <IconButton
                size="xs"
                variant="ghost"
                aria-label={expandAll ? 'Collapse all' : 'Expand all'}
                onClick={() => setExpandAll(!expandAll)}
              >
                {expandAll ? <FiMinimize2 /> : <FiMaximize2 />}
              </IconButton>
              <IconButton
                size="xs"
                variant="ghost"
                aria-label="Tree view"
                onClick={() => setCurrentView('tree')}
              >
                <FiList />
              </IconButton>
              <IconButton
                size="xs"
                variant="ghost"
                aria-label="Timeline view"
                onClick={() => setCurrentView('timeline')}
              >
                <FiCalendar />
              </IconButton>
              {onCreateSection && (
                <IconButton size="xs" aria-label="New section" onClick={() => onCreateSection()}>
                  <FiPlus />
                </IconButton>
              )}
            </HStack>
          </HStack>

          <VStack align="stretch" gap={2}>
            <HStack justify="space-between">
              <Text fontSize="sm" color="fg.muted">
                Total: {totalWords.toLocaleString()} words
              </Text>
              <Text fontSize="sm" color="fg.muted">
                {Math.round(completionPercentage)}% Complete
              </Text>
            </HStack>
            <Progress.Root value={completionPercentage}>
              <Progress.Range />
            </Progress.Root>
            <HStack gap={3} fontSize="xs">
              {Object.entries(completionStats).map(([status, count]) => (
                <HStack key={status} gap={1}>
                  <Box color={statusColors[status as SectionStatus] + '.500'}>
                    {statusIcons[status as SectionStatus]}
                  </Box>
                  <Text>{count}</Text>
                </HStack>
              ))}
            </HStack>
          </VStack>
        </Box>

        <Box flex={1} overflowY="auto">
          {currentView === 'tree' ? (
            <VStack align="stretch" p={2} gap={1}>
              {sections.map((section) => (
                <SectionNode
                  key={section.id}
                  section={section}
                  isSelected={selectedSectionId === section.id}
                  onSelect={() => onSelectSection(section.id)}
                  onContextMenu={(action) => handleContextMenu(section.id, action)}
                  onStatusChange={(status) => onStatusChange?.(section.id, status)}
                  onMoveSection={onMoveSection}
                  level={0}
                />
              ))}
            </VStack>
          ) : (
            <TimelineView
              sections={sections}
              selectedSectionId={selectedSectionId}
              onSelectSection={onSelectSection}
            />
          )}
        </Box>
      </VStack>
    </DndProvider>
  );
};
