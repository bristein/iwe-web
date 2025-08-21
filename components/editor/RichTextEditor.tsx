'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import {
  Box,
  HStack,
  VStack,
  IconButton,
  Button,
  Text,
  Separator,
  Group,
  Select,
} from '@chakra-ui/react';
import {
  FiBold,
  FiItalic,
  FiUnderline,
  FiList,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
  FiAlignJustify,
  FiMaximize,
  FiMinimize,
  FiSave,
  FiDownload,
} from 'react-icons/fi';
import { MdFormatQuote, MdFormatListNumbered } from 'react-icons/md';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSave?: () => void;
  onExport?: (format: 'html' | 'markdown' | 'text') => void;
  autoSave?: boolean;
  autoSaveDelay?: number;
  showWordCount?: boolean;
  showSessionCount?: boolean;
  targetWordCount?: number;
  minHeight?: string;
  maxHeight?: string;
  distractionFreeMode?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Start writing your story...',
  onSave,
  onExport,
  autoSave = true,
  autoSaveDelay = 3000,
  showWordCount = true,
  showSessionCount = true,
  targetWordCount,
  minHeight = '500px',
  maxHeight = '100vh',
  distractionFreeMode: initialDistractionFree = false,
}) => {
  const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [distractionFreeMode, setDistractionFreeMode] = useState(initialDistractionFree);
  const [sessionStartWords, setSessionStartWords] = useState(0);
  const [textFormat, setTextFormat] = useState('paragraph');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Typography,
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount,
      Highlight,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      handleContentChange(html);
    },
  });

  useEffect(() => {
    if (editor && sessionStartWords === 0) {
      setSessionStartWords(editor.storage.characterCount?.words() || 0);
    }
  }, [editor, sessionStartWords]);

  const handleContentChange = useCallback(
    (newContent: string) => {
      onChange(newContent);

      if (autoSave && onSave) {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
        autoSaveTimerRef.current = setTimeout(() => {
          setIsSaving(true);
          onSave();
          setTimeout(() => setIsSaving(false), 1000);
        }, autoSaveDelay);
      }
    },
    [onChange, autoSave, onSave, autoSaveDelay]
  );

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, []);

  const toggleBold = () => editor?.chain().focus().toggleBold().run();
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor?.chain().focus().toggleUnderline?.().run();
  const toggleHighlight = () => editor?.chain().focus().toggleHighlight().run();
  const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor?.chain().focus().toggleOrderedList().run();
  const toggleBlockquote = () => editor?.chain().focus().toggleBlockquote().run();

  const setAlignment = (align: 'left' | 'center' | 'right' | 'justify') => {
    // Text alignment may require a separate extension
    // For now, we'll skip this functionality
  };

  const handleFormatChange = (format: string) => {
    setTextFormat(format);
    switch (format) {
      case 'heading1':
        editor?.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'heading2':
        editor?.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'heading3':
        editor?.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'paragraph':
        editor?.chain().focus().setParagraph().run();
        break;
    }
  };

  const handleExport = (format: 'html' | 'markdown' | 'text') => {
    if (onExport) {
      onExport(format);
    } else {
      let content = '';
      let mimeType = 'text/plain';
      switch (format) {
        case 'html':
          content = editor?.getHTML() || '';
          mimeType = 'text/html';
          break;
        case 'text':
          content = editor?.getText() || '';
          mimeType = 'text/plain';
          break;
        case 'markdown':
          content = editor?.getText() || '';
          mimeType = 'text/markdown';
          break;
      }
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `manuscript.${format}`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const wordCount = editor?.storage.characterCount?.words() || 0;
  const charCount = editor?.storage.characterCount?.characters() || 0;
  const sessionWords = wordCount - sessionStartWords;
  const progressPercentage = targetWordCount ? (wordCount / targetWordCount) * 100 : 0;

  const EditorToolbar = () => (
    <VStack width="100%" gap={0}>
      <Group gap={1} p={2} borderBottom="1px solid" borderColor="border" width="100%">
        <select
          value={textFormat}
          onChange={(e) => handleFormatChange(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid var(--chakra-colors-border)',
            background: 'var(--chakra-colors-bg)',
            fontSize: '14px',
            minWidth: '150px',
          }}
        >
          <option value="paragraph">Paragraph</option>
          <option value="heading1">Heading 1</option>
          <option value="heading2">Heading 2</option>
          <option value="heading3">Heading 3</option>
        </select>

        <Separator orientation="vertical" height="24px" />

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
          variant={editor?.isActive('underline') ? 'solid' : 'ghost'}
          onClick={toggleUnderline}
          aria-label="Underline"
        >
          <FiUnderline />
        </IconButton>
        <IconButton
          size="sm"
          variant={editor?.isActive('highlight') ? 'solid' : 'ghost'}
          onClick={toggleHighlight}
          aria-label="Highlight"
        >
          <Text fontSize="xs">H</Text>
        </IconButton>

        <Separator orientation="vertical" height="24px" />

        <IconButton size="sm" onClick={() => setAlignment('left')} aria-label="Align Left">
          <FiAlignLeft />
        </IconButton>
        <IconButton size="sm" onClick={() => setAlignment('center')} aria-label="Align Center">
          <FiAlignCenter />
        </IconButton>
        <IconButton size="sm" onClick={() => setAlignment('right')} aria-label="Align Right">
          <FiAlignRight />
        </IconButton>
        <IconButton size="sm" onClick={() => setAlignment('justify')} aria-label="Align Justify">
          <FiAlignJustify />
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
          variant={editor?.isActive('orderedList') ? 'solid' : 'ghost'}
          onClick={toggleOrderedList}
          aria-label="Numbered List"
        >
          <MdFormatListNumbered />
        </IconButton>
        <IconButton
          size="sm"
          variant={editor?.isActive('blockquote') ? 'solid' : 'ghost'}
          onClick={toggleBlockquote}
          aria-label="Quote"
        >
          <MdFormatQuote />
        </IconButton>

        <Group ml="auto">
          <IconButton
            size="sm"
            onClick={() => setDistractionFreeMode(!distractionFreeMode)}
            aria-label={distractionFreeMode ? 'Exit Distraction Free' : 'Distraction Free Mode'}
          >
            {distractionFreeMode ? <FiMinimize /> : <FiMaximize />}
          </IconButton>
          {onSave && (
            <IconButton size="sm" onClick={onSave} aria-label="Save">
              <FiSave />
            </IconButton>
          )}
          <IconButton size="sm" onClick={() => handleExport('html')} aria-label="Export">
            <FiDownload />
          </IconButton>
        </Group>
      </Group>
    </VStack>
  );

  if (distractionFreeMode) {
    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg="bg"
        zIndex={1000}
        display="flex"
        flexDirection="column"
      >
        <HStack p={2} justify="space-between" borderBottom="1px solid" borderColor="border">
          <Text fontSize="sm" color="fg.muted">
            {wordCount} words
          </Text>
          <IconButton
            size="sm"
            onClick={() => setDistractionFreeMode(false)}
            aria-label="Exit Distraction Free"
          >
            <FiMinimize />
          </IconButton>
        </HStack>
        <Box flex={1} maxWidth="800px" margin="0 auto" width="100%" p={8} overflowY="auto">
          <EditorContent editor={editor} />
        </Box>
      </Box>
    );
  }

  return (
    <VStack width="100%" align="stretch" gap={0}>
      <EditorToolbar />

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

      {(showWordCount || showSessionCount || targetWordCount || isSaving) && (
        <HStack p={2} borderTop="1px solid" borderColor="border" justify="space-between">
          <HStack gap={4}>
            {showWordCount && (
              <Text fontSize="sm" color="fg.muted">
                Total: {wordCount} words
              </Text>
            )}
            {showSessionCount && (
              <Text fontSize="sm" color="fg.muted">
                Session: {sessionWords > 0 ? '+' : ''}
                {sessionWords} words
              </Text>
            )}
            {targetWordCount && (
              <HStack gap={2}>
                <Text fontSize="sm" color="fg.muted">
                  Progress: {Math.round(progressPercentage)}%
                </Text>
                <Box width="100px" height="4px" bg="bg.muted" borderRadius="full">
                  <Box
                    width={`${Math.min(progressPercentage, 100)}%`}
                    height="100%"
                    bg={progressPercentage >= 100 ? 'green.500' : 'blue.500'}
                    borderRadius="full"
                    transition="width 0.3s ease"
                  />
                </Box>
              </HStack>
            )}
          </HStack>
          {isSaving && (
            <Text fontSize="sm" color="green.500">
              Auto-saving...
            </Text>
          )}
        </HStack>
      )}
    </VStack>
  );
};
