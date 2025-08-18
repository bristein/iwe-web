'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Dialog,
  Field,
  VStack,
  Input,
  Textarea,
  HStack,
  Text,
  Box,
  Select,
} from '@chakra-ui/react';
import { createListCollection } from '@chakra-ui/react/collection';
import { FormButton, Switch } from '@/components';
import { FaPlus, FaTimes } from 'react-icons/fa';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ProjectStatus =
  | 'draft'
  | 'planning'
  | 'active'
  | 'drafting'
  | 'editing'
  | 'completed'
  | 'archived';

interface ProjectFormData {
  title: string;
  description: string;
  genre: string;
  status: ProjectStatus;
  wordCountGoal: number | null;
  tags: string[];
  settings: {
    isPublic: boolean;
    allowComments: boolean;
  };
}

interface FormErrors {
  title?: string;
  description?: string;
  genre?: string;
  wordCountGoal?: string;
  tags?: string;
  general?: string;
}

// Move static data outside component for performance
const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'drafting', label: 'Drafting' },
  { value: 'editing', label: 'Editing' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const GENRE_OPTIONS = [
  'Fantasy',
  'Science Fiction',
  'Mystery',
  'Thriller',
  'Romance',
  'Literary Fiction',
  'Historical Fiction',
  'Horror',
  'Young Adult',
  'Non-Fiction',
  'Biography',
  'Poetry',
  'Short Story',
  'Other',
] as const;

const GENRE_COLLECTION = createListCollection({
  items: GENRE_OPTIONS.map((g) => ({ label: g, value: g })),
});

const STATUS_COLLECTION = createListCollection({
  items: STATUS_OPTIONS,
});

const INITIAL_FORM_DATA: ProjectFormData = {
  title: '',
  description: '',
  genre: '',
  status: 'draft',
  wordCountGoal: null,
  tags: [],
  settings: {
    isPublic: false,
    allowComments: true,
  },
};

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [formData, setFormData] = useState<ProjectFormData>(INITIAL_FORM_DATA);
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      // Small delay to ensure modal is fully rendered
      const timeoutId = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Validation function
  const validateForm = useCallback((): FormErrors => {
    const newErrors: FormErrors = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length > 200) {
      newErrors.title = 'Title must be 200 characters or less';
    }

    // Description validation
    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be 1000 characters or less';
    }

    // Word count goal validation
    if (formData.wordCountGoal !== null && formData.wordCountGoal <= 0) {
      newErrors.wordCountGoal = 'Word count goal must be a positive number';
    }

    // Tags validation
    if (formData.tags.length > 20) {
      newErrors.tags = 'You can have at most 20 tags';
    }

    for (const tag of formData.tags) {
      if (tag.length > 50) {
        newErrors.tags = 'Each tag must be 50 characters or less';
        break;
      }
    }

    return newErrors;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const projectData: Partial<ProjectFormData> = {
        title: formData.title.trim(),
        status: formData.status,
        settings: formData.settings,
      };

      if (formData.description.trim()) {
        projectData.description = formData.description.trim();
      }

      if (formData.genre && formData.genre !== 'Other') {
        projectData.genre = formData.genre;
      }

      if (formData.wordCountGoal !== null) {
        projectData.wordCountGoal = formData.wordCountGoal;
      }

      if (formData.tags.length > 0) {
        projectData.tags = formData.tags;
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 400 && data.details) {
          // Zod validation errors from server
          const serverErrors: FormErrors = {};
          data.details.forEach((detail: { path?: string[]; message: string }) => {
            if (detail.path) {
              const field = detail.path[0];
              serverErrors[field as keyof FormErrors] = detail.message;
            }
          });
          setErrors(serverErrors);
          return;
        }

        setErrors({ general: data.error || 'Failed to create project' });
        return;
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : 'Network error. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setTagsInput('');
    setErrors({});
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // Form field update handlers
  const updateFormData = useCallback(
    <K extends keyof ProjectFormData>(field: K, value: ProjectFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear field error when user starts typing
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  const handleTagsChange = useCallback(
    (value: string) => {
      setTagsInput(value);
      const tags = value
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      updateFormData('tags', tags);
    },
    [updateFormData]
  );

  const handleWordCountGoalChange = useCallback(
    (value: string) => {
      const numValue = value ? parseInt(value, 10) : null;
      if (numValue === null || (!isNaN(numValue) && numValue > 0)) {
        updateFormData('wordCountGoal', numValue);
      }
    },
    [updateFormData]
  );

  // Memoized collections to prevent unnecessary re-renders
  const genreCollection = useMemo(() => GENRE_COLLECTION, []);
  const statusCollection = useMemo(() => STATUS_COLLECTION, []);

  // Form validation state
  const isFormValid = useMemo(() => {
    return formData.title.trim().length > 0 && Object.keys(validateForm()).length === 0;
  }, [formData.title, validateForm]);

  // Error display helper
  const getFieldError = (field: keyof FormErrors) => errors[field];
  const hasFieldError = (field: keyof FormErrors) => Boolean(errors[field]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && handleClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="2xl" p="6">
          <Dialog.Header>
            <Dialog.Title fontSize="2xl" fontWeight="bold">
              Create New Project
            </Dialog.Title>
            <Dialog.CloseTrigger asChild>
              <FormButton variant="ghost" size="sm" aria-label="Close dialog">
                <FaTimes />
              </FormButton>
            </Dialog.CloseTrigger>
          </Dialog.Header>

          <Dialog.Body>
            <form onSubmit={handleSubmit}>
              <VStack gap="4" align="stretch">
                {errors.general && (
                  <Box
                    p="3"
                    borderRadius="md"
                    bg="red.50"
                    borderWidth="1px"
                    borderColor="red.200"
                    role="alert"
                    aria-live="polite"
                  >
                    <Text color="red.600" fontSize="sm">
                      {errors.general}
                    </Text>
                  </Box>
                )}

                <Field.Root required invalid={hasFieldError('title')}>
                  <Field.Label>Project Title</Field.Label>
                  <Input
                    ref={titleInputRef}
                    placeholder="Enter your project title"
                    value={formData.title}
                    onChange={(e) => updateFormData('title', e.target.value)}
                    maxLength={200}
                    data-testid="project-title-input"
                    aria-describedby="title-helper title-error"
                    aria-invalid={hasFieldError('title')}
                  />
                  {hasFieldError('title') ? (
                    <Field.ErrorText id="title-error">{getFieldError('title')}</Field.ErrorText>
                  ) : (
                    <Field.HelperText id="title-helper">
                      Give your project a memorable title
                    </Field.HelperText>
                  )}
                </Field.Root>

                <Field.Root invalid={hasFieldError('description')}>
                  <Field.Label>Description</Field.Label>
                  <Textarea
                    placeholder="Describe your project..."
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    maxLength={1000}
                    rows={3}
                    data-testid="project-description-input"
                    aria-describedby="description-helper description-error"
                    aria-invalid={hasFieldError('description')}
                  />
                  {hasFieldError('description') ? (
                    <Field.ErrorText id="description-error">
                      {getFieldError('description')}
                    </Field.ErrorText>
                  ) : (
                    <Field.HelperText id="description-helper">
                      A brief description of what your project is about (
                      {formData.description.length}/1000)
                    </Field.HelperText>
                  )}
                </Field.Root>

                <HStack gap="4">
                  <Field.Root flex="1">
                    <Field.Label>Genre</Field.Label>
                    <Select.Root
                      collection={genreCollection}
                      value={formData.genre ? [formData.genre] : []}
                      onValueChange={(e) => updateFormData('genre', e.value[0] || '')}
                    >
                      <Select.Trigger aria-label="Select project genre">
                        <Select.ValueText placeholder="Select a genre" />
                      </Select.Trigger>
                      <Select.Content>
                        {genreCollection.items.map((option) => (
                          <Select.Item key={option.value} item={option}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                    <Field.HelperText>Choose the primary genre for your project</Field.HelperText>
                  </Field.Root>

                  <Field.Root flex="1">
                    <Field.Label>Status</Field.Label>
                    <Select.Root
                      collection={statusCollection}
                      value={[formData.status]}
                      onValueChange={(e) =>
                        updateFormData('status', (e.value[0] as ProjectStatus) || 'draft')
                      }
                    >
                      <Select.Trigger aria-label="Select project status">
                        <Select.ValueText />
                      </Select.Trigger>
                      <Select.Content>
                        {statusCollection.items.map((option) => (
                          <Select.Item key={option.value} item={option}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                    <Field.HelperText>Current state of your project</Field.HelperText>
                  </Field.Root>
                </HStack>

                <Field.Root invalid={hasFieldError('wordCountGoal')}>
                  <Field.Label>Word Count Goal</Field.Label>
                  <Input
                    type="number"
                    placeholder="e.g., 50000"
                    value={formData.wordCountGoal?.toString() || ''}
                    onChange={(e) => handleWordCountGoalChange(e.target.value)}
                    min={1}
                    max={1000000}
                    data-testid="word-count-goal-input"
                    aria-describedby="wordcount-helper wordcount-error"
                    aria-invalid={hasFieldError('wordCountGoal')}
                  />
                  {hasFieldError('wordCountGoal') ? (
                    <Field.ErrorText id="wordcount-error">
                      {getFieldError('wordCountGoal')}
                    </Field.ErrorText>
                  ) : (
                    <Field.HelperText id="wordcount-helper">
                      Set a target word count for your project
                    </Field.HelperText>
                  )}
                </Field.Root>

                <Field.Root invalid={hasFieldError('tags')}>
                  <Field.Label>Tags</Field.Label>
                  <Input
                    placeholder="Enter tags separated by commas"
                    value={tagsInput}
                    onChange={(e) => handleTagsChange(e.target.value)}
                    data-testid="project-tags-input"
                    aria-describedby="tags-helper tags-error"
                    aria-invalid={hasFieldError('tags')}
                  />
                  {hasFieldError('tags') ? (
                    <Field.ErrorText id="tags-error">{getFieldError('tags')}</Field.ErrorText>
                  ) : (
                    <Field.HelperText id="tags-helper">
                      Add tags to organize your project (comma-separated, max 20 tags)
                    </Field.HelperText>
                  )}
                  {formData.tags.length > 0 && (
                    <Box mt="2">
                      <Text fontSize="xs" color="fg.muted">
                        Tags: {formData.tags.join(', ')}
                      </Text>
                    </Box>
                  )}
                </Field.Root>

                <VStack align="stretch" gap="4" pt="2">
                  <Box>
                    <Text fontWeight="medium" mb="3">
                      Project Settings
                    </Text>
                    <VStack gap="4">
                      <Switch
                        checked={formData.settings.isPublic}
                        onChange={(checked) =>
                          updateFormData('settings', { ...formData.settings, isPublic: checked })
                        }
                        label="Make project public"
                        description="Allow others to view your project"
                        data-testid="project-public-switch"
                        id="public-switch"
                      />
                      <Switch
                        checked={formData.settings.allowComments}
                        onChange={(checked) =>
                          updateFormData('settings', {
                            ...formData.settings,
                            allowComments: checked,
                          })
                        }
                        label="Allow comments"
                        description="Let others comment on your project"
                        data-testid="project-comments-switch"
                        id="comments-switch"
                      />
                    </VStack>
                  </Box>
                </VStack>
              </VStack>

              <Dialog.Footer mt="6">
                <HStack gap="3" justify="flex-end">
                  <FormButton
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={loading}
                  >
                    Cancel
                  </FormButton>
                  <FormButton
                    type="submit"
                    variant="primary"
                    disabled={!isFormValid || loading}
                    loading={loading}
                    data-testid="create-project-submit"
                    aria-describedby={!isFormValid ? 'form-validation-error' : undefined}
                  >
                    <HStack gap="2">
                      <FaPlus />
                      <Text>Create Project</Text>
                    </HStack>
                  </FormButton>
                </HStack>
              </Dialog.Footer>
            </form>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
