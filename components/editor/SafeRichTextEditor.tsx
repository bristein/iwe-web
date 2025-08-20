'use client';

import React from 'react';
import { RichTextEditor } from './RichTextEditor';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Box, Text } from '@chakra-ui/react';

interface SafeRichTextEditorProps extends React.ComponentProps<typeof RichTextEditor> {
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export const SafeRichTextEditor: React.FC<SafeRichTextEditorProps> = ({ onError, ...props }) => {
  return (
    <ErrorBoundary
      onError={onError}
      fallback={
        <Box p={4} borderRadius="md" border="1px solid" borderColor="red.300" bg="red.50">
          <Text color="red.600">
            The rich text editor encountered an error. Please refresh the page or try again later.
          </Text>
        </Box>
      }
      resetKeys={[props.value]}
      resetOnPropsChange={true}
    >
      <RichTextEditor {...props} />
    </ErrorBoundary>
  );
};

export default SafeRichTextEditor;
