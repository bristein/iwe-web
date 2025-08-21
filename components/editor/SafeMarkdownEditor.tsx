'use client';

import React from 'react';
import { MarkdownEditor } from './MarkdownEditor';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Box, Text } from '@chakra-ui/react';

interface SafeMarkdownEditorProps extends React.ComponentProps<typeof MarkdownEditor> {
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export const SafeMarkdownEditor: React.FC<SafeMarkdownEditorProps> = ({ onError, ...props }) => {
  return (
    <ErrorBoundary
      onError={onError}
      fallback={
        <Box p={4} borderRadius="md" border="1px solid" borderColor="red.300" bg="red.50">
          <Text color="red.600">
            The markdown editor encountered an error. Please refresh the page or try again later.
          </Text>
        </Box>
      }
      resetKeys={[props.value]}
      resetOnPropsChange={true}
    >
      <MarkdownEditor {...props} />
    </ErrorBoundary>
  );
};

export default SafeMarkdownEditor;
