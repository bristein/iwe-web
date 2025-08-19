'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, VStack, Text, Button, Alert } from '@chakra-ui/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  resetKeys?: string[];
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorBoundaryKey: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorBoundaryKey: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => key !== prevProps.resetKeys?.[idx])) {
        this.resetErrorBoundary();
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorBoundaryKey: this.state.errorBoundaryKey + 1,
    });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, level = 'component' } = this.props;

    if (hasError) {
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <Box p="6" maxW="xl" mx="auto">
          <Alert.Root status="error" borderRadius="lg">
            <Alert.Indicator />
            <Box flex="1">
              <Alert.Title mb="2">
                {level === 'page' && 'Page Error'}
                {level === 'section' && 'Section Error'}
                {level === 'component' && 'Component Error'}
              </Alert.Title>
              <Alert.Description>
                <VStack align="start" gap="3">
                  <Text fontSize="sm">{error?.message || 'An unexpected error occurred'}</Text>
                  {process.env.NODE_ENV === 'development' && (
                    <Box
                      as="pre"
                      fontSize="xs"
                      p="2"
                      bg="bg.subtle"
                      borderRadius="md"
                      overflowX="auto"
                      maxW="full"
                    >
                      {error?.stack}
                    </Box>
                  )}
                  <Button size="sm" variant="outline" onClick={this.resetErrorBoundary}>
                    Try Again
                  </Button>
                </VStack>
              </Alert.Description>
            </Box>
          </Alert.Root>
        </Box>
      );
    }

    return <React.Fragment key={this.state.errorBoundaryKey}>{children}</React.Fragment>;
  }
}

// HOC for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
