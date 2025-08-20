'use client';

import React, { useState, useCallback } from 'react';
import {
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogCloseTrigger,
  Button,
  Input,
  Textarea,
  Select,
  VStack,
  HStack,
  Text,
  Badge,
  Tabs,
  IconButton,
  Box,
} from '@chakra-ui/react';
import { FiPlus, FiX, FiFileText, FiTag, FiUser } from 'react-icons/fi';

interface WorldBibleTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
}

interface CreateWorldBibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    category: string;
    content: string;
    tags: string[];
    characterKnowledge: string[];
    template?: string;
  }) => void;
  categories: Array<{ id: string; name: string }>;
  characters: Array<{ id: string; name: string }>;
  availableTags?: string[];
  templates?: WorldBibleTemplate[];
}

export const CreateWorldBibleModal: React.FC<CreateWorldBibleModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  categories,
  characters,
  availableTags = [],
  templates = [],
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [activeTab, setActiveTab] = useState(0);

  const handleAddTag = useCallback(() => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  }, [newTag, tags]);

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      setTags(tags.filter((tag) => tag !== tagToRemove));
    },
    [tags]
  );

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setSelectedTemplate(templateId);
        setContent(template.content);
        setCategory(template.category);
      }
    },
    [templates]
  );

  const handleSubmit = useCallback(() => {
    if (title && category) {
      onCreate({
        title,
        category,
        content,
        tags,
        characterKnowledge: selectedCharacters,
        template: selectedTemplate,
      });
      onClose();
      // Reset form
      setTitle('');
      setCategory('');
      setContent('');
      setTags([]);
      setSelectedCharacters([]);
      setSelectedTemplate('');
      setActiveTab(0);
    }
  }, [title, category, content, tags, selectedCharacters, selectedTemplate, onCreate, onClose]);

  const suggestedTags = availableTags.filter(
    (tag) => !tags.includes(tag) && tag.toLowerCase().includes(newTag.toLowerCase())
  );

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && onClose()} size="xl">
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <HStack>
                <FiFileText />
                <Text>Create World Bible Document</Text>
              </HStack>
            </DialogTitle>
            <DialogCloseTrigger />
          </DialogHeader>

          <DialogBody>
            <Tabs.Root
              value={String(activeTab)}
              onValueChange={(e) => setActiveTab(Number(e.value))}
            >
              <Tabs.List>
                <Tabs.Trigger value="0">Basic Information</Tabs.Trigger>
                <Tabs.Trigger value="1">Metadata</Tabs.Trigger>
                {templates.length > 0 && <Tabs.Trigger value="2">Templates</Tabs.Trigger>}
              </Tabs.List>

              <Tabs.ContentGroup>
                <Tabs.Content value="0">
                  <VStack align="stretch" gap={4}>
                    <VStack align="stretch">
                      <Text fontSize="sm" fontWeight="medium">
                        Title *
                      </Text>
                      <Input
                        placeholder="Enter document title..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </VStack>

                    <VStack align="stretch">
                      <Text fontSize="sm" fontWeight="medium">
                        Category *
                      </Text>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '6px',
                          border: '1px solid var(--chakra-colors-border)',
                          background: 'var(--chakra-colors-bg)',
                        }}
                      >
                        <option value="">Select category...</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </VStack>

                    <VStack align="stretch">
                      <Text fontSize="sm" fontWeight="medium">
                        Initial Content
                      </Text>
                      <Textarea
                        placeholder="Start writing your document..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        minHeight="200px"
                      />
                    </VStack>
                  </VStack>
                </Tabs.Content>

                <Tabs.Content value="1">
                  <VStack align="stretch" gap={4}>
                    <VStack align="stretch">
                      <HStack>
                        <FiTag />
                        <Text fontSize="sm" fontWeight="medium">
                          Tags
                        </Text>
                      </HStack>
                      <HStack flexWrap="wrap" gap={2} mb={2}>
                        {tags.map((tag) => (
                          <Badge key={tag} variant="outline" pr={1}>
                            {tag}
                            <IconButton
                              size="xs"
                              variant="ghost"
                              aria-label="Remove tag"
                              onClick={() => handleRemoveTag(tag)}
                              ml={1}
                            >
                              <FiX />
                            </IconButton>
                          </Badge>
                        ))}
                      </HStack>
                      <HStack>
                        <Input
                          placeholder="Add tag..."
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                        />
                        <IconButton aria-label="Add tag" onClick={handleAddTag}>
                          <FiPlus />
                        </IconButton>
                      </HStack>
                      {suggestedTags.length > 0 && (
                        <HStack flexWrap="wrap" gap={1} mt={2}>
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

                    <VStack align="stretch">
                      <HStack>
                        <FiUser />
                        <Text fontSize="sm" fontWeight="medium">
                          Character Knowledge
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="fg.muted">
                        Select characters who will know about this document
                      </Text>
                      <VStack align="stretch" maxHeight="200px" overflowY="auto">
                        {characters.map((char) => (
                          <HStack key={char.id}>
                            <input
                              type="checkbox"
                              id={char.id}
                              value={char.id}
                              checked={selectedCharacters.includes(char.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCharacters([...selectedCharacters, char.id]);
                                } else {
                                  setSelectedCharacters(
                                    selectedCharacters.filter((id) => id !== char.id)
                                  );
                                }
                              }}
                            />
                            <label htmlFor={char.id}>{char.name}</label>
                          </HStack>
                        ))}
                      </VStack>
                    </VStack>
                  </VStack>
                </Tabs.Content>

                {templates.length > 0 && (
                  <Tabs.Content value="2">
                    <VStack align="stretch" gap={2}>
                      <Text fontSize="sm" color="fg.muted">
                        Select a template to pre-fill your document
                      </Text>
                      {templates.map((template) => (
                        <Box
                          key={template.id}
                          p={3}
                          borderRadius="md"
                          border="2px solid"
                          borderColor={
                            selectedTemplate === template.id ? 'colorPalette.500' : 'border'
                          }
                          bg={selectedTemplate === template.id ? 'colorPalette.subtle' : 'bg'}
                          cursor="pointer"
                          onClick={() => handleTemplateSelect(template.id)}
                          _hover={{ bg: 'bg.subtle' }}
                        >
                          <Text fontWeight="medium">{template.name}</Text>
                          <Text fontSize="sm" color="fg.muted">
                            {template.description}
                          </Text>
                          <Badge size="sm" mt={2}>
                            {categories.find((c) => c.id === template.category)?.name}
                          </Badge>
                        </Box>
                      ))}
                    </VStack>
                  </Tabs.Content>
                )}
              </Tabs.ContentGroup>
            </Tabs.Root>
          </DialogBody>

          <DialogFooter>
            <HStack>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button colorPalette="blue" onClick={handleSubmit} disabled={!title || !category}>
                Create Document
              </Button>
            </HStack>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
};
