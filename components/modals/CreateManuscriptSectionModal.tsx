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
  RadioGroup,
  NumberInput,
  Badge,
} from '@chakra-ui/react';
import { FiBook, FiFileText, FiTarget } from 'react-icons/fi';

type SectionType = 'book' | 'part' | 'chapter' | 'scene';

interface ManuscriptSection {
  id: string;
  title: string;
  type: SectionType;
}

interface CreateManuscriptSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    type: SectionType;
    title: string;
    description: string;
    parentId?: string;
    targetWordCount?: number;
    outline?: string;
  }) => void;
  parentSection?: ManuscriptSection;
  existingSections: ManuscriptSection[];
  suggestedType?: SectionType;
}

const sectionTypeLabels: Record<SectionType, string> = {
  book: 'Book',
  part: 'Part',
  chapter: 'Chapter',
  scene: 'Scene',
};

const defaultWordCounts: Record<SectionType, number> = {
  book: 80000,
  part: 20000,
  chapter: 4000,
  scene: 1500,
};

const outlineTemplates: Record<SectionType, string> = {
  book: `## Synopsis
Brief overview of the book...

## Main Characters
- Character 1: Role and arc
- Character 2: Role and arc

## Key Themes
- Theme 1
- Theme 2

## Target Audience
Description of intended readers...`,

  part: `## Part Overview
What happens in this part...

## Key Events
- Event 1
- Event 2

## Character Development
How characters change in this part...`,

  chapter: `## Chapter Summary
What happens in this chapter...

## Scene Breakdown
1. Opening scene
2. Middle scenes
3. Closing scene

## Chapter Goals
- Plot advancement
- Character development
- Theme exploration`,

  scene: `## Scene Purpose
Why this scene exists...

## Setting
Where and when...

## Characters Present
- Character 1 (POV)
- Character 2

## Key Actions
1. What happens first
2. What happens next
3. How it ends

## Dialogue Notes
Important conversations...`,
};

export const CreateManuscriptSectionModal: React.FC<CreateManuscriptSectionModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  parentSection,
  existingSections,
  suggestedType = 'chapter',
}) => {
  const [type, setType] = useState<SectionType>(suggestedType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>(parentSection?.id || '');
  const [targetWordCount, setTargetWordCount] = useState(defaultWordCounts[suggestedType]);
  const [outline, setOutline] = useState('');
  const [useTemplate, setUseTemplate] = useState(false);

  const getAvailableTypes = useCallback((): SectionType[] => {
    if (!parentSection) {
      return ['book', 'chapter'];
    }
    switch (parentSection.type) {
      case 'book':
        return ['part', 'chapter'];
      case 'part':
        return ['chapter'];
      case 'chapter':
        return ['scene'];
      default:
        return [];
    }
  }, [parentSection]);

  const availableTypes = getAvailableTypes();

  const getAvailableParents = useCallback(() => {
    return existingSections.filter((section) => {
      switch (type) {
        case 'book':
          return false;
        case 'part':
          return section.type === 'book';
        case 'chapter':
          return section.type === 'book' || section.type === 'part';
        case 'scene':
          return section.type === 'chapter';
        default:
          return false;
      }
    });
  }, [existingSections, type]);

  const availableParents = getAvailableParents();

  const handleTypeChange = useCallback(
    (newType: SectionType) => {
      setType(newType);
      setTargetWordCount(defaultWordCounts[newType]);
      if (useTemplate) {
        setOutline(outlineTemplates[newType]);
      }
    },
    [useTemplate]
  );

  const handleUseTemplate = useCallback(() => {
    if (!useTemplate) {
      setOutline(outlineTemplates[type]);
      setUseTemplate(true);
    } else {
      setOutline('');
      setUseTemplate(false);
    }
  }, [type, useTemplate]);

  const handleSubmit = useCallback(() => {
    if (title) {
      onCreate({
        type,
        title,
        description,
        parentId: parentId || undefined,
        targetWordCount: targetWordCount || undefined,
        outline: outline || undefined,
      });
      onClose();
      // Reset form
      setType(suggestedType);
      setTitle('');
      setDescription('');
      setParentId(parentSection?.id || '');
      setTargetWordCount(defaultWordCounts[suggestedType]);
      setOutline('');
      setUseTemplate(false);
    }
  }, [
    type,
    title,
    description,
    parentId,
    targetWordCount,
    outline,
    onCreate,
    onClose,
    suggestedType,
    parentSection,
  ]);

  const getNumberSuffix = useCallback(() => {
    const sameTypeSections = existingSections.filter((s) => s.type === type);
    return sameTypeSections.length + 1;
  }, [existingSections, type]);

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && onClose()} size="xl">
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <HStack>
                {type === 'scene' ? <FiFileText /> : <FiBook />}
                <Text>Create Manuscript Section</Text>
              </HStack>
            </DialogTitle>
            <DialogCloseTrigger />
          </DialogHeader>

          <DialogBody>
            <VStack align="stretch" gap={4}>
              <VStack align="stretch">
                <Text fontSize="sm" fontWeight="medium">
                  Section Type *
                </Text>
                <RadioGroup.Root
                  value={type}
                  onValueChange={(e) => handleTypeChange(e.value as SectionType)}
                >
                  <HStack gap={4}>
                    {availableTypes.map((sectionType) => (
                      <RadioGroup.Item key={sectionType} value={sectionType}>
                        <RadioGroup.ItemControl />
                        <RadioGroup.ItemText>{sectionTypeLabels[sectionType]}</RadioGroup.ItemText>
                      </RadioGroup.Item>
                    ))}
                  </HStack>
                </RadioGroup.Root>
              </VStack>

              <VStack align="stretch">
                <Text fontSize="sm" fontWeight="medium">
                  Title *
                </Text>
                <Input
                  placeholder={`${sectionTypeLabels[type]} ${getNumberSuffix()}: Enter title...`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </VStack>

              {availableParents.length > 0 && (
                <VStack align="stretch">
                  <Text fontSize="sm" fontWeight="medium">
                    Parent Section
                  </Text>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--chakra-colors-border)',
                      background: 'var(--chakra-colors-bg)',
                    }}
                  >
                    <option value="">None (Top level)</option>
                    {availableParents.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.title} ({sectionTypeLabels[section.type]})
                      </option>
                    ))}
                  </select>
                </VStack>
              )}

              <VStack align="stretch">
                <Text fontSize="sm" fontWeight="medium">
                  Description
                </Text>
                <Textarea
                  placeholder="Brief description of what happens in this section..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  minHeight="80px"
                />
              </VStack>

              <VStack align="stretch">
                <HStack>
                  <FiTarget />
                  <Text fontSize="sm" fontWeight="medium">
                    Target Word Count
                  </Text>
                </HStack>
                <NumberInput.Root
                  value={String(targetWordCount)}
                  onValueChange={(e) => setTargetWordCount(Number(e.value))}
                  min={0}
                  step={100}
                >
                  <NumberInput.Input />
                  <NumberInput.Control>
                    <NumberInput.IncrementTrigger />
                    <NumberInput.DecrementTrigger />
                  </NumberInput.Control>
                </NumberInput.Root>
                <HStack gap={2}>
                  <Text fontSize="xs" color="fg.muted">
                    Suggested counts:
                  </Text>
                  {Object.entries(defaultWordCounts)
                    .filter(([key]) => availableTypes.includes(key as SectionType))
                    .map(([key, count]) => (
                      <Badge
                        key={key}
                        size="sm"
                        variant="subtle"
                        cursor="pointer"
                        onClick={() => setTargetWordCount(count)}
                      >
                        {sectionTypeLabels[key as SectionType]}: {count.toLocaleString()}
                      </Badge>
                    ))}
                </HStack>
              </VStack>

              <VStack align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="sm" fontWeight="medium">
                    Initial Outline
                  </Text>
                  <Button size="xs" variant="ghost" onClick={handleUseTemplate}>
                    {useTemplate ? 'Clear Template' : 'Use Template'}
                  </Button>
                </HStack>
                <Textarea
                  placeholder="Outline your section structure..."
                  value={outline}
                  onChange={(e) => setOutline(e.target.value)}
                  minHeight="150px"
                  fontFamily="mono"
                  fontSize="sm"
                />
              </VStack>
            </VStack>
          </DialogBody>

          <DialogFooter>
            <HStack>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button colorPalette="blue" onClick={handleSubmit} disabled={!title}>
                Create {sectionTypeLabels[type]}
              </Button>
            </HStack>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
};
