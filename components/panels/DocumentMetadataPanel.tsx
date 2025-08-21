'use client';

import React, { useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Textarea,
  Badge,
  Button,
  IconButton,
  Separator,
  Editable,
  EditablePreview,
  EditableInput,
  EditableTextarea,
} from '@chakra-ui/react';
import {
  FiEdit2,
  FiSave,
  FiX,
  FiPlus,
  FiTag,
  FiLink,
  FiUser,
  FiCalendar,
  FiClock,
  FiFileText,
  FiHash,
  FiBookOpen,
} from 'react-icons/fi';

interface DocumentMetadata {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tags: string[];
  relatedDocuments: Array<{ id: string; title: string }>;
  characterKnowledge: Array<{ id: string; name: string; knows: boolean; partial?: boolean }>;
  createdAt: Date;
  modifiedAt: Date;
  wordCount: number;
  readingTime: number;
  version?: number;
}

interface DocumentMetadataPanelProps {
  metadata: DocumentMetadata;
  onUpdate?: (updates: Partial<DocumentMetadata>) => void;
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
  onLinkDocument?: (documentId: string) => void;
  onUnlinkDocument?: (documentId: string) => void;
  onUpdateCharacterKnowledge?: (characterId: string, knows: boolean, partial?: boolean) => void;
  availableTags?: string[];
  availableDocuments?: Array<{ id: string; title: string }>;
  availableCharacters?: Array<{ id: string; name: string }>;
  showVersionHistory?: boolean;
  onViewVersion?: (version: number) => void;
  editable?: boolean;
}

export const DocumentMetadataPanel: React.FC<DocumentMetadataPanelProps> = ({
  metadata,
  onUpdate,
  onAddTag,
  onRemoveTag,
  onLinkDocument,
  onUnlinkDocument,
  onUpdateCharacterKnowledge,
  availableTags = [],
  availableDocuments = [],
  availableCharacters = [],
  showVersionHistory = false,
  onViewVersion,
  editable = true,
}) => {
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isLinkingDocument, setIsLinkingDocument] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [showAllCharacters, setShowAllCharacters] = useState(false);

  const handleTitleChange = useCallback(
    (details: { value: string }) => {
      if (onUpdate && details.value !== metadata.title) {
        onUpdate({ title: details.value });
      }
    },
    [metadata.title, onUpdate]
  );

  const handleDescriptionChange = useCallback(
    (details: { value: string }) => {
      if (onUpdate && details.value !== metadata.description) {
        onUpdate({ description: details.value });
      }
    },
    [metadata.description, onUpdate]
  );

  const handleAddTag = useCallback(() => {
    if (newTag && onAddTag) {
      onAddTag(newTag);
      setNewTag('');
    }
  }, [newTag, onAddTag]);

  const handleLinkDocument = useCallback(() => {
    if (selectedDocumentId && onLinkDocument) {
      onLinkDocument(selectedDocumentId);
      setSelectedDocumentId('');
      setIsLinkingDocument(false);
    }
  }, [selectedDocumentId, onLinkDocument]);

  const suggestedTags = availableTags.filter(
    (tag) => !metadata.tags.includes(tag) && tag.toLowerCase().includes(newTag.toLowerCase())
  );

  const unlinkedDocuments = availableDocuments.filter(
    (doc) => !metadata.relatedDocuments.some((related) => related.id === doc.id)
  );

  const displayedCharacters = showAllCharacters
    ? metadata.characterKnowledge
    : metadata.characterKnowledge.filter((char) => char.knows || char.partial);

  return (
    <VStack align="stretch" gap={4} p={4}>
      <VStack align="stretch" gap={2}>
        <HStack>
          <FiFileText />
          <Text fontWeight="medium">Document Information</Text>
        </HStack>

        {editable ? (
          <Editable.Root value={metadata.title} onValueChange={handleTitleChange}>
            <Editable.Preview fontSize="lg" fontWeight="bold" />
            <Editable.Input />
          </Editable.Root>
        ) : (
          <Text fontSize="lg" fontWeight="bold">
            {metadata.title}
          </Text>
        )}

        {editable ? (
          <Editable.Root value={metadata.description || ''} onValueChange={handleDescriptionChange}>
            <Editable.Preview color="fg.muted" fontSize="sm" minHeight="40px" />
            <Editable.Textarea minHeight="40px" fontSize="sm" />
          </Editable.Root>
        ) : (
          <Text color="fg.muted" fontSize="sm">
            {metadata.description}
          </Text>
        )}

        {metadata.category && (
          <HStack>
            <Badge variant="subtle">{metadata.category}</Badge>
          </HStack>
        )}
      </VStack>

      <Separator />

      <VStack align="stretch" gap={2}>
        <HStack justify="space-between">
          <HStack>
            <FiTag />
            <Text fontWeight="medium">Tags</Text>
          </HStack>
          {editable && (
            <IconButton
              size="xs"
              variant="ghost"
              aria-label="Edit tags"
              onClick={() => setIsEditingTags(!isEditingTags)}
            >
              {isEditingTags ? <FiX /> : <FiEdit2 />}
            </IconButton>
          )}
        </HStack>

        <HStack flexWrap="wrap" gap={2}>
          {metadata.tags.map((tag) => (
            <Badge key={tag} variant="outline" pr={editable && isEditingTags ? 1 : 2}>
              {tag}
              {editable && isEditingTags && (
                <IconButton
                  size="xs"
                  variant="ghost"
                  aria-label="Remove tag"
                  onClick={() => onRemoveTag?.(tag)}
                  ml={1}
                >
                  <FiX />
                </IconButton>
              )}
            </Badge>
          ))}
        </HStack>

        {editable && isEditingTags && (
          <HStack>
            <Input
              size="sm"
              placeholder="Add tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            />
            <IconButton size="sm" aria-label="Add tag" onClick={handleAddTag}>
              <FiPlus />
            </IconButton>
          </HStack>
        )}

        {suggestedTags.length > 0 && isEditingTags && (
          <HStack flexWrap="wrap" gap={1}>
            {suggestedTags.slice(0, 5).map((tag) => (
              <Badge
                key={tag}
                variant="subtle"
                cursor="pointer"
                onClick={() => {
                  setNewTag(tag);
                  handleAddTag();
                }}
              >
                {tag}
              </Badge>
            ))}
          </HStack>
        )}
      </VStack>

      <Separator />

      <VStack align="stretch" gap={2}>
        <HStack justify="space-between">
          <HStack>
            <FiLink />
            <Text fontWeight="medium">Related Documents</Text>
          </HStack>
          {editable && (
            <IconButton
              size="xs"
              variant="ghost"
              aria-label="Link document"
              onClick={() => setIsLinkingDocument(!isLinkingDocument)}
            >
              {isLinkingDocument ? <FiX /> : <FiPlus />}
            </IconButton>
          )}
        </HStack>

        <VStack align="stretch" gap={1}>
          {metadata.relatedDocuments.map((doc) => (
            <HStack key={doc.id} justify="space-between">
              <Text fontSize="sm">{doc.title}</Text>
              {editable && (
                <IconButton
                  size="xs"
                  variant="ghost"
                  aria-label="Unlink document"
                  onClick={() => onUnlinkDocument?.(doc.id)}
                >
                  <FiX />
                </IconButton>
              )}
            </HStack>
          ))}
        </VStack>

        {editable && isLinkingDocument && unlinkedDocuments.length > 0 && (
          <HStack>
            <select
              value={selectedDocumentId}
              onChange={(e) => setSelectedDocumentId(e.target.value)}
              style={{ flex: 1, padding: '4px', borderRadius: '4px' }}
            >
              <option value="">Select document...</option>
              {unlinkedDocuments.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title}
                </option>
              ))}
            </select>
            <IconButton
              size="sm"
              aria-label="Link selected"
              onClick={handleLinkDocument}
              disabled={!selectedDocumentId}
            >
              <FiPlus />
            </IconButton>
          </HStack>
        )}
      </VStack>

      <Separator />

      <VStack align="stretch" gap={2}>
        <HStack justify="space-between">
          <HStack>
            <FiUser />
            <Text fontWeight="medium">Character Knowledge</Text>
          </HStack>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setShowAllCharacters(!showAllCharacters)}
          >
            {showAllCharacters ? 'Show Known' : 'Show All'}
          </Button>
        </HStack>

        <VStack align="stretch" gap={1}>
          {displayedCharacters.map((char) => (
            <HStack key={char.id} justify="space-between">
              <Text fontSize="sm">{char.name}</Text>
              <HStack>
                {char.partial && (
                  <Badge size="xs" variant="subtle" colorPalette="yellow">
                    Partial
                  </Badge>
                )}
                {editable ? (
                  <input
                    type="checkbox"
                    checked={char.knows}
                    onChange={(e) =>
                      onUpdateCharacterKnowledge?.(char.id, e.target.checked, char.partial)
                    }
                  />
                ) : (
                  <Badge size="xs" variant="subtle" colorPalette={char.knows ? 'green' : 'gray'}>
                    {char.knows ? 'Knows' : 'Unknown'}
                  </Badge>
                )}
              </HStack>
            </HStack>
          ))}
        </VStack>
      </VStack>

      <Separator />

      <VStack align="stretch" gap={2}>
        <HStack>
          <FiHash />
          <Text fontWeight="medium">Statistics</Text>
        </HStack>

        <VStack align="stretch" gap={1} fontSize="sm">
          <HStack justify="space-between">
            <Text color="fg.muted">Word Count</Text>
            <Text>{metadata.wordCount.toLocaleString()}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text color="fg.muted">Reading Time</Text>
            <Text>{metadata.readingTime} min</Text>
          </HStack>
          <HStack justify="space-between">
            <HStack>
              <FiCalendar />
              <Text color="fg.muted">Created</Text>
            </HStack>
            <Text>{metadata.createdAt.toLocaleDateString()}</Text>
          </HStack>
          <HStack justify="space-between">
            <HStack>
              <FiClock />
              <Text color="fg.muted">Modified</Text>
            </HStack>
            <Text>{metadata.modifiedAt.toLocaleDateString()}</Text>
          </HStack>
          {metadata.version && (
            <HStack justify="space-between">
              <Text color="fg.muted">Version</Text>
              <Text>{metadata.version}</Text>
            </HStack>
          )}
        </VStack>
      </VStack>

      {showVersionHistory && onViewVersion && (
        <>
          <Separator />
          <VStack align="stretch" gap={2}>
            <HStack>
              <FiBookOpen />
              <Text fontWeight="medium">Version History</Text>
            </HStack>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewVersion(metadata.version || 1)}
            >
              View History
            </Button>
          </VStack>
        </>
      )}
    </VStack>
  );
};
