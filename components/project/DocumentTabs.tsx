'use client';

import React, { useState, useMemo } from 'react';
import { Box, VStack, HStack, Text, Tabs, IconButton, Badge, Center } from '@chakra-ui/react';
import { FaTimes, FaPlus, FaFileAlt, FaBook, FaFeatherAlt, FaEye, FaEdit } from 'react-icons/fa';

interface DocumentTabsProps {
  projectId: string; // Will be used for API calls in future phases
}

interface OpenDocument {
  id: string;
  title: string;
  type: 'worldbible' | 'manuscript';
  category?: string;
  content?: string;
  isEditing: boolean;
}

export default function DocumentTabs({
  projectId: _projectId, // eslint-disable-line @typescript-eslint/no-unused-vars
}: DocumentTabsProps) {
  // _projectId will be used for API calls in future phases
  const [activeTab, setActiveTab] = useState('doc-1');
  const [openDocuments, setOpenDocuments] = useState<OpenDocument[]>([
    {
      id: 'doc-1',
      title: 'Aria Moonwhisper',
      type: 'worldbible',
      category: 'Characters',
      isEditing: false,
      content: `# Aria Moonwhisper

## Basic Information
- **Age:** 28
- **Race:** Half-elf
- **Class:** Arcane Scholar
- **Affiliation:** The Crystal Academy

## Physical Description
Aria stands at 5'8" with an ethereal grace characteristic of her elven heritage. Her silver hair cascades to her shoulders, often tied back when she's deep in study. Her eyes, a striking violet hue, seem to shimmer with arcane energy when she casts spells.

## Background
Born to an elven mother and human father, Aria grew up straddling two worlds. Her childhood in the border town of Silverbridge exposed her to both cultures, fostering a unique perspective that would later serve her well as a diplomat and scholar.

At age 15, her magical abilities manifested dramatically during a goblin raid on her village. The raw power she displayed caught the attention of Master Aldric from the Crystal Academy, who immediately offered her a scholarship.

## Personality Traits
- **Curious:** Constantly seeking knowledge, sometimes to her detriment
- **Compassionate:** Despite her scholarly nature, deeply cares for others
- **Perfectionist:** Can be overly critical of herself
- **Diplomatic:** Skilled at navigating complex social situations

## Abilities & Skills
### Magical Abilities
- Specializes in elemental magic, particularly lightning and ice
- Can read ancient languages through magical comprehension
- Skilled in creating protective wards and barriers

### Other Skills
- Fluent in Common, Elvish, and Draconic
- Expert in ancient history and magical theory
- Competent with a quarterstaff for self-defense

## Relationships
- **Master Aldric:** Mentor and father figure
- **Lord Blackthorne:** Complicated romantic interest
- **Zephyr the Swift:** Best friend and adventuring companion
- **Queen Elara:** Distant cousin through elven bloodline

## Character Arc
Aria begins as a sheltered academic but must learn to apply her theoretical knowledge in the real world when ancient threats emerge. Her journey involves reconciling her dual heritage and discovering that true power comes not from books alone, but from understanding and embracing who she truly is.

## Notable Possessions
- **Staff of the Storm Sage:** Inherited from her grandmother
- **Tome of Infinite Pages:** A magical book that never runs out of pages
- **Crystal Pendant:** Allows communication with the Academy

## Secrets & Hidden Knowledge
- Knows the location of the lost Library of Aethon
- Suspects Lord Blackthorne's connection to the Shadow Council
- Carries a fragment of the Worldstone without realizing its significance`,
    },
  ]);

  const closeDocument = (docId: string) => {
    setOpenDocuments(openDocuments.filter((doc) => doc.id !== docId));
    if (activeTab === docId && openDocuments.length > 1) {
      const remainingDocs = openDocuments.filter((doc) => doc.id !== docId);
      setActiveTab(remainingDocs[0].id);
    }
  };

  const toggleEditMode = (docId: string) => {
    setOpenDocuments(
      openDocuments.map((doc) => (doc.id === docId ? { ...doc, isEditing: !doc.isEditing } : doc))
    );
  };

  const getDocumentIcon = (type: string) => {
    if (type === 'manuscript') return <FaFeatherAlt />;
    if (type === 'worldbible') return <FaBook />;
    return <FaFileAlt />;
  };

  const activeDocument = openDocuments.find((doc) => doc.id === activeTab);

  // Memoize parsed content to avoid re-parsing on every render
  const parsedContent = useMemo(() => {
    if (!activeDocument?.content) return null;

    return activeDocument.content.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return (
          <Text key={index} as="h1" fontSize="2em" fontWeight="bold" mt="4" mb="2">
            {line.substring(2)}
          </Text>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <Text key={index} as="h2" fontSize="1.5em" fontWeight="bold" mt="3" mb="2">
            {line.substring(3)}
          </Text>
        );
      }
      if (line.startsWith('### ')) {
        return (
          <Text key={index} as="h3" fontSize="1.2em" fontWeight="bold" mt="2" mb="1">
            {line.substring(4)}
          </Text>
        );
      }
      if (line.startsWith('- ')) {
        return (
          <HStack key={index} align="start" gap="2" ml="4">
            <Text>•</Text>
            <Text>{line.substring(2)}</Text>
          </HStack>
        );
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <Text key={index} fontWeight="bold" my="2">
            {line.substring(2, line.length - 2)}
          </Text>
        );
      }
      if (line.trim() === '') {
        return <Box key={index} height="2" />;
      }
      return (
        <Text key={index} lineHeight="1.6" my="1">
          {line}
        </Text>
      );
    });
  }, [activeDocument?.content]);

  if (openDocuments.length === 0) {
    return (
      <Center h="100%" bg="bg.canvas">
        <VStack gap="4" p="8">
          <Box fontSize="4xl" color="fg.muted">
            <FaFileAlt />
          </Box>
          <Text fontSize="lg" color="fg.muted">
            No documents open
          </Text>
          <Text fontSize="sm" color="fg.muted" textAlign="center">
            Select a document from the sidebar or create a new one to get started
          </Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box h="100%" display="flex" flexDirection="column">
      {/* Document Tabs */}
      <Box borderBottomWidth="1px" borderColor="border.default" bg="bg.default" flexShrink="0">
        <Tabs.Root
          value={activeTab}
          onValueChange={(details) => setActiveTab(details.value)}
          size="sm"
        >
          <HStack gap="0" h="auto">
            <Box flex="1" overflowX="auto" overflowY="hidden">
              <Tabs.List borderBottomWidth="0" h="auto">
                {openDocuments.map((doc) => (
                  <Tabs.Trigger key={doc.id} value={doc.id} position="relative" pr="8">
                    <HStack gap="2">
                      <Box color={doc.type === 'worldbible' ? 'secondary.500' : 'brand.500'}>
                        {getDocumentIcon(doc.type)}
                      </Box>
                      <Text>{doc.title}</Text>
                      {doc.category && (
                        <Badge size="xs" variant="subtle">
                          {doc.category}
                        </Badge>
                      )}
                    </HStack>
                    <IconButton
                      position="absolute"
                      right="1"
                      top="50%"
                      transform="translateY(-50%)"
                      size="xs"
                      variant="ghost"
                      aria-label="Close document"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeDocument(doc.id);
                      }}
                    >
                      <FaTimes />
                    </IconButton>
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </Box>
            <IconButton variant="ghost" size="sm" aria-label="Open new document" mx="2">
              <FaPlus />
            </IconButton>
          </HStack>
        </Tabs.Root>
      </Box>

      {/* Document Content Area */}
      <Box flex="1" bg="bg.default" overflow="hidden">
        {activeDocument && (
          <VStack h="100%" align="stretch" gap="0">
            {/* Document Toolbar */}
            <HStack
              px="4"
              py="2"
              borderBottomWidth="1px"
              borderColor="border.default"
              justify="space-between"
            >
              <HStack gap="3">
                <Text fontSize="sm" color="fg.muted">
                  {activeDocument.type === 'worldbible' ? 'World Bible' : 'Manuscript'}
                </Text>
                {activeDocument.category && (
                  <>
                    <Text fontSize="sm" color="fg.muted">
                      /
                    </Text>
                    <Text fontSize="sm" color="fg.muted">
                      {activeDocument.category}
                    </Text>
                  </>
                )}
              </HStack>
              <HStack gap="2">
                <IconButton
                  size="sm"
                  variant={activeDocument.isEditing ? 'solid' : 'outline'}
                  aria-label="Toggle edit mode"
                  onClick={() => toggleEditMode(activeDocument.id)}
                >
                  {activeDocument.isEditing ? <FaEye /> : <FaEdit />}
                </IconButton>
              </HStack>
            </HStack>

            {/* Document Editor/Preview */}
            <Box flex="1" p="6" overflowY="auto">
              {activeDocument.isEditing ? (
                <textarea
                  style={{
                    width: '100%',
                    height: '100%',
                    padding: '1rem',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--chakra-colors-bg-canvas)',
                    borderWidth: '1px',
                    borderColor: 'var(--chakra-colors-border-default)',
                    borderRadius: '0.375rem',
                    resize: 'none',
                  }}
                  defaultValue={activeDocument.content}
                  placeholder="Start writing..."
                />
              ) : (
                <Box maxW="4xl" mx="auto">
                  <VStack align="stretch" gap="2">
                    {parsedContent || (
                      <Text color="fg.muted">No content yet. Click edit to start writing.</Text>
                    )}
                  </VStack>
                </Box>
              )}
            </Box>

            {/* Status Bar */}
            <HStack
              px="4"
              py="2"
              borderTopWidth="1px"
              borderColor="border.default"
              fontSize="xs"
              color="fg.muted"
            >
              <Text>{activeDocument.content?.split(' ').length || 0} words</Text>
              <Text>•</Text>
              <Text>{activeDocument.content?.split('\n').length || 0} lines</Text>
              <Text>•</Text>
              <Text>{activeDocument.isEditing ? 'Editing' : 'Preview'}</Text>
            </HStack>
          </VStack>
        )}
      </Box>
    </Box>
  );
}
