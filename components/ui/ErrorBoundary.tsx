'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, VStack, HStack, Text, Button, Alert } from '@chakra-ui/react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError } = this.props;

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call the optional error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Update state with error details
    this.setState((prevState) => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));
  }

  componentDidUpdate(prevProps: Props): void {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error boundary if resetKeys changed
    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => key !== prevProps.resetKeys?.[idx])) {
        this.resetErrorBoundary();
      }
    }

    // Reset on any props change if specified
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error, errorCount } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <Box p={4} borderRadius="md" border="1px solid" borderColor="red.300" bg="red.50">
          <VStack align="stretch" gap={3}>
            <Alert.Root status="error">
              <Alert.Indicator>
                <FiAlertTriangle />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title>Something went wrong</Alert.Title>
                <Alert.Description>
                  {error.message || 'An unexpected error occurred'}
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>

            {process.env.NODE_ENV === 'development' && (
              <Box p={2} bg="gray.100" borderRadius="md" fontSize="sm" fontFamily="mono">
                <Text fontWeight="bold">Error Stack:</Text>
                <Text whiteSpace="pre-wrap" fontSize="xs" color="gray.700">
                  {error.stack}
                </Text>
              </Box>
            )}

            <HStack gap={2}>
              <Button
                size="sm"
                onClick={this.resetErrorBoundary}
                colorPalette="blue"
                variant="solid"
              >
                <FiRefreshCw />
                Try Again
              </Button>
              {errorCount > 2 && (
                <Text fontSize="sm" color="gray.600">
                  Error occurred {errorCount} times
                </Text>
              )}
            </HStack>
          </VStack>
        </Box>
      );
    }

    return children;
  }
}

// Hook for using error boundary in functional components
export function useErrorHandler(): (error: Error) => void {
  const [, setError] = React.useState<Error | null>(null);

  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
