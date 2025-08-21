'use client';

import React, { useState, useCallback, useMemo, useTransition } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Input,
  Badge,
  Collapsible,
  useDisclosure,
  Menu,
} from '@chakra-ui/react';
import {
  FiChevronDown,
  FiChevronRight,
  FiFolder,
  FiFile,
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiClock,
  FiLink,
  FiMoreVertical,
} from 'react-icons/fi';

interface WorldBibleDocument {
  id: string;
  title: string;
  categoryId: string;
  content?: string;
  tags: string[];
  relatedDocuments: string[];
  characterKnowledge: string[];
  wordCount: number;
  lastModified: Date;
}

interface WorldBibleCategory {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
  parentId?: string;
}

interface WorldBibleTreeProps {
  categories: WorldBibleCategory[];
  documents: WorldBibleDocument[];
  selectedDocumentId?: string;
  onSelectDocument: (documentId: string) => void;
  onCreateDocument?: (categoryId: string) => void;
  onEditDocument?: (documentId: string) => void;
  onDeleteDocument?: (documentId: string) => void;
  onMoveDocument?: (documentId: string, newCategoryId: string) => void;
  onCreateCategory?: (parentId?: string) => void;
  onEditCategory?: (categoryId: string) => void;
  onDeleteCategory?: (categoryId: string) => void;
  showRecentDocuments?: boolean;
}

const ItemTypes = {
  DOCUMENT: 'document',
  CATEGORY: 'category',
};

const TreeNode: React.FC<{
  category: WorldBibleCategory;
  documents: WorldBibleDocument[];
  selectedDocumentId?: string;
  onSelectDocument: (documentId: string) => void;
  onContextMenu: (type: 'category' | 'document', id: string, action: string) => void;
  onMoveDocument?: (documentId: string, newCategoryId: string) => void;
  searchTerm: string;
  level: number;
}> = ({
  category,
  documents,
  selectedDocumentId,
  onSelectDocument,
  onContextMenu,
  onMoveDocument,
  searchTerm,
  level,
}) => {
  const { open: isOpen, onToggle } = useDisclosure({ defaultOpen: level === 0 });
  const categoryDocuments = documents.filter((doc) => doc.categoryId === category.id);

  const filteredDocuments = useMemo(() => {
    if (!searchTerm) return categoryDocuments;

    const searchLower = searchTerm.toLowerCase();
    return categoryDocuments.filter(
      (doc) =>
        doc.title.toLowerCase().includes(searchLower) ||
        doc.tags.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  }, [categoryDocuments, searchTerm]);

  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.DOCUMENT,
    drop: (item: { id: string }) => {
      if (onMoveDocument) {
        onMoveDocument(item.id, category.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <Box ref={drop} ml={level * 4}>
      <HStack
        p={2}
        borderRadius="md"
        bg={isOver ? 'bg.muted' : undefined}
        _hover={{ bg: 'bg.subtle' }}
        cursor="pointer"
        onClick={onToggle}
      >
        <IconButton
          size="xs"
          variant="ghost"
          aria-label="Toggle category"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {isOpen ? <FiChevronDown /> : <FiChevronRight />}
        </IconButton>
        <FiFolder />
        <Text flex={1} fontWeight="medium">
          {category.name}
        </Text>
        <Badge size="sm" variant="subtle">
          {category.documentCount}
        </Badge>
        <Menu.Root>
          <Menu.Trigger asChild>
            <IconButton
              size="xs"
              variant="ghost"
              aria-label="Category options"
              onClick={(e) => e.stopPropagation()}
            >
              <FiMoreVertical />
            </IconButton>
          </Menu.Trigger>
          <Menu.Positioner>
            <Menu.Content>
              <Menu.Item
                value="create"
                onSelect={() => onContextMenu('category', category.id, 'create')}
              >
                <FiPlus /> New Document
              </Menu.Item>
              <Menu.Item
                value="edit"
                onSelect={() => onContextMenu('category', category.id, 'edit')}
              >
                <FiEdit2 /> Edit Category
              </Menu.Item>
              <Menu.Item
                value="delete"
                onSelect={() => onContextMenu('category', category.id, 'delete')}
              >
                <FiTrash2 /> Delete Category
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Menu.Root>
      </HStack>

      <Collapsible.Root open={isOpen}>
        <Collapsible.Content>
          <VStack align="stretch" gap={1} mt={1}>
            {filteredDocuments.map((doc) => (
              <DocumentNode
                key={doc.id}
                document={doc}
                isSelected={selectedDocumentId === doc.id}
                onSelect={() => onSelectDocument(doc.id)}
                onContextMenu={(action) => onContextMenu('document', doc.id, action)}
                level={level + 1}
              />
            ))}
          </VStack>
        </Collapsible.Content>
      </Collapsible.Root>
    </Box>
  );
};

const DocumentNode: React.FC<{
  document: WorldBibleDocument;
  isSelected: boolean;
  onSelect: () => void;
  onContextMenu: (action: string) => void;
  level: number;
}> = ({ document, isSelected, onSelect, onContextMenu, level }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.DOCUMENT,
    item: { id: document.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <HStack
      ref={(node) => {
        if (node) drag(node);
      }}
      ml={level * 4}
      p={2}
      borderRadius="md"
      bg={isSelected ? 'colorPalette.subtle' : undefined}
      _hover={{ bg: 'bg.subtle' }}
      cursor="pointer"
      opacity={isDragging ? 0.5 : 1}
      onClick={onSelect}
    >
      <FiFile />
      <VStack align="start" flex={1} gap={0}>
        <Text fontSize="sm">{document.title}</Text>
        <HStack gap={1}>
          {document.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} size="xs" variant="outline">
              {tag}
            </Badge>
          ))}
          {document.tags.length > 2 && (
            <Badge size="xs" variant="outline">
              +{document.tags.length - 2}
            </Badge>
          )}
        </HStack>
      </VStack>
      {document.relatedDocuments.length > 0 && (
        <Badge size="xs" variant="subtle">
          <FiLink />
          {document.relatedDocuments.length}
        </Badge>
      )}
      <Text fontSize="xs" color="fg.muted">
        {document.wordCount} words
      </Text>
      <Menu.Root>
        <Menu.Trigger asChild>
          <IconButton
            size="xs"
            variant="ghost"
            aria-label="Document options"
            onClick={(e) => e.stopPropagation()}
          >
            <FiMoreVertical />
          </IconButton>
        </Menu.Trigger>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.Item value="edit" onSelect={() => onContextMenu('edit')}>
              <FiEdit2 /> Edit
            </Menu.Item>
            <Menu.Item value="delete" onSelect={() => onContextMenu('delete')}>
              <FiTrash2 /> Delete
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Menu.Root>
    </HStack>
  );
};

export const WorldBibleTree: React.FC<WorldBibleTreeProps> = ({
  categories,
  documents,
  selectedDocumentId,
  onSelectDocument,
  onCreateDocument,
  onEditDocument,
  onDeleteDocument,
  onMoveDocument,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
  showRecentDocuments = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();

  const recentDocuments = useMemo(() => {
    if (!showRecentDocuments) return [];
    return [...documents]
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
      .slice(0, 5);
  }, [documents, showRecentDocuments]);

  const handleContextMenu = useCallback(
    (type: 'category' | 'document', id: string, action: string) => {
      if (type === 'category') {
        switch (action) {
          case 'create':
            onCreateDocument?.(id);
            break;
          case 'edit':
            onEditCategory?.(id);
            break;
          case 'delete':
            onDeleteCategory?.(id);
            break;
        }
      } else {
        switch (action) {
          case 'edit':
            onEditDocument?.(id);
            break;
          case 'delete':
            onDeleteDocument?.(id);
            break;
        }
      }
    },
    [
      onCreateDocument,
      onEditDocument,
      onDeleteDocument,
      onCreateCategory,
      onEditCategory,
      onDeleteCategory,
    ]
  );

  const rootCategories = categories.filter((cat) => !cat.parentId);

  return (
    <DndProvider backend={HTML5Backend}>
      <VStack align="stretch" height="100%" gap={2}>
        <HStack p={2}>
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => startTransition(() => setSearchTerm(e.target.value))}
            size="sm"
            disabled={isPending}
          />
          {onCreateCategory && (
            <IconButton size="sm" aria-label="New category" onClick={() => onCreateCategory()}>
              <FiPlus />
            </IconButton>
          )}
        </HStack>

        {showRecentDocuments && recentDocuments.length > 0 && (
          <Box p={2}>
            <HStack mb={2}>
              <FiClock />
              <Text fontSize="sm" fontWeight="medium">
                Recently Edited
              </Text>
            </HStack>
            <VStack align="stretch" gap={1}>
              {recentDocuments.map((doc) => (
                <HStack
                  key={doc.id}
                  p={1}
                  borderRadius="md"
                  bg={selectedDocumentId === doc.id ? 'colorPalette.subtle' : undefined}
                  _hover={{ bg: 'bg.subtle' }}
                  cursor="pointer"
                  onClick={() => onSelectDocument(doc.id)}
                >
                  <FiFile />
                  <Text fontSize="sm" flex={1}>
                    {doc.title}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {new Date(doc.lastModified).toLocaleDateString()}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </Box>
        )}

        <Box flex={1} overflowY="auto" p={2}>
          <VStack align="stretch" gap={1}>
            {rootCategories.map((category) => (
              <TreeNode
                key={category.id}
                category={category}
                documents={documents}
                selectedDocumentId={selectedDocumentId}
                onSelectDocument={onSelectDocument}
                onContextMenu={handleContextMenu}
                onMoveDocument={onMoveDocument}
                searchTerm={searchTerm}
                level={0}
              />
            ))}
          </VStack>
        </Box>
      </VStack>
    </DndProvider>
  );
};
