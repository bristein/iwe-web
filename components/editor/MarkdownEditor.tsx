'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { common, createLowlight } from 'lowlight';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box, HStack, VStack, IconButton, Button, Text, Separator, Group } from '@chakra-ui/react';
import {
  FiBold,
  FiItalic,
  FiCode,
  FiList,
  FiCheckSquare,
  FiType,
  FiHash,
  FiMinusSquare,
  FiEye,
  FiEdit,
  FiColumns,
} from 'react-icons/fi';

const lowlight = createLowlight(common);

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSave?: () => void;
  autoSave?: boolean;
  autoSaveDelay?: number;
  showWordCount?: boolean;
  minHeight?: string;
  maxHeight?: string;
  frontmatterSupport?: boolean;
}

type ViewMode = 'edit' | 'preview' | 'split';

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Start writing...',
  onSave,
  autoSave = false,
  autoSaveDelay = 2000,
  showWordCount = true,
  minHeight = '400px',
  maxHeight = '600px',
  frontmatterSupport = false,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [frontmatter, setFrontmatter] = useState<string>('');
  const [content, setContent] = useState<string>(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Typography,
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Highlight,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: frontmatterSupport ? content : value,
    onUpdate: ({ editor }) => {
      const markdown = editor.getText();
      handleContentChange(markdown);
    },
  });

  const handleContentChange = useCallback(
    (newContent: string) => {
      if (frontmatterSupport) {
        const fullContent = frontmatter ? `---\n${frontmatter}\n---\n\n${newContent}` : newContent;
        onChange(fullContent);
        setContent(newContent);
      } else {
        onChange(newContent);
      }

      if (autoSave && onSave) {
        if (autoSaveTimer) {
          clearTimeout(autoSaveTimer);
        }
        const timer = setTimeout(() => {
          setIsSaving(true);
          onSave();
          setTimeout(() => setIsSaving(false), 1000);
        }, autoSaveDelay);
        setAutoSaveTimer(timer);
      }
    },
    [frontmatter, frontmatterSupport, onChange, autoSave, onSave, autoSaveDelay, autoSaveTimer]
  );

  useEffect(() => {
    if (frontmatterSupport && value) {
      const frontmatterMatch = value.match(/^---\n([\s\S]*?)\n---\n/);
      if (frontmatterMatch) {
        setFrontmatter(frontmatterMatch[1]);
        setContent(value.replace(frontmatterMatch[0], ''));
      } else {
        setContent(value);
      }
    }
  }, [value, frontmatterSupport]);

  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  const toggleBold = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
  const toggleCode = () => editor?.chain().focus().toggleCode().run();
  const toggleHighlight = () => editor?.chain().focus().toggleHighlight().run();
  const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run();
  const toggleTaskList = () => editor?.chain().focus().toggleTaskList().run();
  const setHeading = (level: 1 | 2 | 3) => editor?.chain().focus().toggleHeading({ level }).run();
  const toggleBlockquote = () => editor?.chain().focus().toggleBlockquote().run();

  const wordCount = editor?.storage.characterCount?.words() || 0;
  const charCount = editor?.storage.characterCount?.characters() || 0;

  const EditorToolbar = () => (
    <Group gap={1} p={2} borderBottom="1px solid" borderColor="border">
      <IconButton
        size="sm"
        variant={editor?.isActive('bold') ? 'solid' : 'ghost'}
        onClick={toggleBold}
        aria-label="Bold"
      >
        <FiBold />
      </IconButton>
      <IconButton
        size="sm"
        variant={editor?.isActive('italic') ? 'solid' : 'ghost'}
        onClick={toggleItalic}
        aria-label="Italic"
      >
        <FiItalic />
      </IconButton>
      <IconButton
        size="sm"
        variant={editor?.isActive('code') ? 'solid' : 'ghost'}
        onClick={toggleCode}
        aria-label="Code"
      >
        <FiCode />
      </IconButton>
      <IconButton
        size="sm"
        variant={editor?.isActive('highlight') ? 'solid' : 'ghost'}
        onClick={toggleHighlight}
        aria-label="Highlight"
      >
        <FiMinusSquare />
      </IconButton>
      <Separator orientation="vertical" height="24px" />
      <IconButton
        size="sm"
        variant={editor?.isActive('heading', { level: 1 }) ? 'solid' : 'ghost'}
        onClick={() => setHeading(1)}
        aria-label="Heading 1"
      >
        <FiType />
      </IconButton>
      <IconButton
        size="sm"
        variant={editor?.isActive('heading', { level: 2 }) ? 'solid' : 'ghost'}
        onClick={() => setHeading(2)}
        aria-label="Heading 2"
      >
        <FiHash />
      </IconButton>
      <Separator orientation="vertical" height="24px" />
      <IconButton
        size="sm"
        variant={editor?.isActive('bulletList') ? 'solid' : 'ghost'}
        onClick={toggleBulletList}
        aria-label="Bullet List"
      >
        <FiList />
      </IconButton>
      <IconButton
        size="sm"
        variant={editor?.isActive('taskList') ? 'solid' : 'ghost'}
        onClick={toggleTaskList}
        aria-label="Task List"
      >
        <FiCheckSquare />
      </IconButton>
      <Separator orientation="vertical" height="24px" />
      <Group ml="auto">
        <Button
          size="sm"
          variant={viewMode === 'edit' ? 'solid' : 'ghost'}
          onClick={() => setViewMode('edit')}
        >
          <FiEdit /> Edit
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'preview' ? 'solid' : 'ghost'}
          onClick={() => setViewMode('preview')}
        >
          <FiEye /> Preview
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'split' ? 'solid' : 'ghost'}
          onClick={() => setViewMode('split')}
        >
          <FiColumns /> Split
        </Button>
      </Group>
    </Group>
  );

  const EditorView = () => (
    <Box
      minHeight={minHeight}
      maxHeight={maxHeight}
      overflowY="auto"
      p={4}
      border="1px solid"
      borderColor="border"
      borderRadius="md"
      bg="bg"
    >
      <EditorContent editor={editor} />
    </Box>
  );

  const PreviewView = () => (
    <Box
      minHeight={minHeight}
      maxHeight={maxHeight}
      overflowY="auto"
      p={4}
      border="1px solid"
      borderColor="border"
      borderRadius="md"
      bg="bg.subtle"
    >
      <Box className="markdown-preview">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {frontmatterSupport ? content : value}
        </ReactMarkdown>
      </Box>
    </Box>
  );

  return (
    <VStack width="100%" align="stretch" gap={0}>
      {frontmatterSupport && frontmatter && (
        <Box p={2} bg="bg.muted" borderRadius="md" mb={2}>
          <Text fontSize="sm" fontFamily="mono">
            Frontmatter: {frontmatter.split('\n').length} lines
          </Text>
        </Box>
      )}

      <EditorToolbar />

      <Box flex={1}>
        {viewMode === 'edit' && <EditorView />}
        {viewMode === 'preview' && <PreviewView />}
        {viewMode === 'split' && (
          <HStack align="stretch" gap={2}>
            <Box flex={1}>
              <EditorView />
            </Box>
            <Box flex={1}>
              <PreviewView />
            </Box>
          </HStack>
        )}
      </Box>

      {(showWordCount || isSaving) && (
        <HStack p={2} borderTop="1px solid" borderColor="border" justify="space-between">
          {showWordCount && (
            <Text fontSize="sm" color="fg.muted">
              {wordCount} words • {charCount} characters
            </Text>
          )}
          {isSaving && (
            <Text fontSize="sm" color="green.500">
              Saving...
            </Text>
          )}
        </HStack>
      )}
    </VStack>
  );
};
