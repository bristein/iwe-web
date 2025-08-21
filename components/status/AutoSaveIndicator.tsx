'use client';

import React, { useState, useEffect } from 'react';
import { Box, HStack, Text, Spinner, Badge, Tooltip, Button } from '@chakra-ui/react';
import {
  FiCheck,
  FiAlertCircle,
  FiWifi,
  FiWifiOff,
  FiCloud,
  FiCloudOff,
  FiRefreshCw,
  FiSave,
} from 'react-icons/fi';

// Constants
const SAVE_STATUS_DISPLAY_DURATION = 3000; // 3 seconds
const TIME_UPDATE_INTERVAL = 60000; // 1 minute
const DEFAULT_AUTO_SAVE_DELAY = 2000; // 2 seconds
const POSITION_OFFSET = 20; // px from edge
const Z_INDEX_MODAL = 1000;
const PULSE_ANIMATION_DURATION = '1s';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
type ConnectionStatus = 'online' | 'offline' | 'reconnecting';

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  connectionStatus?: ConnectionStatus;
  lastSaveTime?: Date;
  onRetry?: () => void;
  onResolveConflict?: () => void;
  showDetails?: boolean;
  position?: 'fixed' | 'relative';
  placement?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const pulseAnimation = {
  '0%': { opacity: 1 },
  '50%': { opacity: 0.5 },
  '100%': { opacity: 1 },
};

const slideIn = {
  from: { transform: 'translateY(-100%)', opacity: 0 },
  to: { transform: 'translateY(0)', opacity: 1 },
};

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  status,
  connectionStatus = 'online',
  lastSaveTime,
  onRetry,
  onResolveConflict,
  showDetails = true,
  position = 'fixed',
  placement = 'top-right',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (status !== 'idle') {
      setIsVisible(true);
      if (status === 'saved') {
        const timer = setTimeout(() => {
          if (status === 'saved') {
            setIsVisible(false);
          }
        }, SAVE_STATUS_DISPLAY_DURATION);
        return () => clearTimeout(timer);
      }
    }
  }, [status]);

  useEffect(() => {
    if (lastSaveTime) {
      const updateTimeAgo = () => {
        const now = new Date();
        const diff = now.getTime() - lastSaveTime.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);

        if (minutes < 1) {
          setTimeAgo('just now');
        } else if (minutes === 1) {
          setTimeAgo('1 minute ago');
        } else if (minutes < 60) {
          setTimeAgo(`${minutes} minutes ago`);
        } else if (hours === 1) {
          setTimeAgo('1 hour ago');
        } else {
          setTimeAgo(`${hours} hours ago`);
        }
      };

      updateTimeAgo();
      const interval = setInterval(updateTimeAgo, TIME_UPDATE_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [lastSaveTime]);

  const getPositionStyles = () => {
    if (position === 'relative') return {};

    const styles: React.CSSProperties = {
      position: 'fixed',
      zIndex: Z_INDEX_MODAL,
    };

    switch (placement) {
      case 'top-right':
        styles.top = `${POSITION_OFFSET}px`;
        styles.right = `${POSITION_OFFSET}px`;
        break;
      case 'top-left':
        styles.top = `${POSITION_OFFSET}px`;
        styles.left = `${POSITION_OFFSET}px`;
        break;
      case 'bottom-right':
        styles.bottom = `${POSITION_OFFSET}px`;
        styles.right = `${POSITION_OFFSET}px`;
        break;
      case 'bottom-left':
        styles.bottom = `${POSITION_OFFSET}px`;
        styles.left = `${POSITION_OFFSET}px`;
        break;
    }

    return styles;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'saving':
        return <Spinner size="sm" />;
      case 'saved':
        return <FiCheck color="green" />;
      case 'error':
        return <FiAlertCircle color="red" />;
      case 'conflict':
        return <FiRefreshCw color="orange" />;
      default:
        return <FiSave />;
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'online':
        return <FiCloud color="green" />;
      case 'offline':
        return <FiCloudOff color="gray" />;
      case 'reconnecting':
        return <FiWifiOff color="orange" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'All changes saved';
      case 'error':
        return 'Failed to save';
      case 'conflict':
        return 'Sync conflict detected';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'saving':
        return 'blue';
      case 'saved':
        return 'green';
      case 'error':
        return 'red';
      case 'conflict':
        return 'orange';
      default:
        return 'gray';
    }
  };

  if (!isVisible && status === 'idle') return null;

  return (
    <Box
      style={getPositionStyles()}
      css={{
        animation: position === 'fixed' ? 'slideIn 0.3s ease-out' : undefined,
        '@keyframes slideIn': slideIn,
      }}
    >
      <HStack
        bg="bg"
        p={2}
        borderRadius="md"
        shadow="lg"
        border="1px solid"
        borderColor="border"
        gap={2}
      >
        {connectionStatus !== 'online' && (
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Box
                css={{
                  animation:
                    connectionStatus === 'reconnecting'
                      ? `pulse ${PULSE_ANIMATION_DURATION} infinite`
                      : undefined,
                  '@keyframes pulse': pulseAnimation,
                }}
              >
                {getConnectionIcon()}
              </Box>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content>
                {connectionStatus === 'offline'
                  ? 'Working offline - changes will sync when reconnected'
                  : 'Reconnecting to server...'}
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
        )}

        <HStack gap={1}>
          <Box
            css={{
              animation:
                status === 'saving' ? `pulse ${PULSE_ANIMATION_DURATION} infinite` : undefined,
              '@keyframes pulse': pulseAnimation,
            }}
          >
            {getStatusIcon()}
          </Box>
          {showDetails && (
            <Text fontSize="sm" color={`${getStatusColor()}.600`}>
              {getStatusMessage()}
            </Text>
          )}
        </HStack>

        {status === 'saved' && lastSaveTime && showDetails && (
          <Text fontSize="xs" color="fg.muted">
            {timeAgo}
          </Text>
        )}

        {status === 'error' && onRetry && (
          <Button size="xs" variant="ghost" onClick={onRetry}>
            Retry
          </Button>
        )}

        {status === 'conflict' && onResolveConflict && (
          <Button size="xs" variant="ghost" colorPalette="orange" onClick={onResolveConflict}>
            Resolve
          </Button>
        )}
      </HStack>
    </Box>
  );
};

interface AutoSaveProviderProps {
  children: React.ReactNode;
  onSave: () => Promise<void>;
  autoSaveDelay?: number;
  enabled?: boolean;
}

export const AutoSaveProvider: React.FC<AutoSaveProviderProps> = ({
  children,
  onSave,
  autoSaveDelay = DEFAULT_AUTO_SAVE_DELAY,
  enabled = true,
}) => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('online');
  const [lastSaveTime, setLastSaveTime] = useState<Date | undefined>();
  const [pendingSave, setPendingSave] = useState(false);
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSave = React.useCallback(() => {
    if (!enabled) return;

    setPendingSave(true);

    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    const timer = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await onSave();
        setSaveStatus('saved');
        setLastSaveTime(new Date());
        setPendingSave(false);
      } catch (error) {
        if (connectionStatus === 'offline') {
          setSaveStatus('idle');
        } else {
          setSaveStatus('error');
        }
      }
    }, autoSaveDelay);

    setSaveTimer(timer);
  }, [enabled, onSave, autoSaveDelay, connectionStatus, saveTimer]);

  const handleRetry = React.useCallback(async () => {
    setSaveStatus('saving');
    try {
      await onSave();
      setSaveStatus('saved');
      setLastSaveTime(new Date());
    } catch (error) {
      setSaveStatus('error');
    }
  }, [onSave]);

  React.useEffect(() => {
    // Listen for document changes if needed
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSave) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingSave]);

  return (
    <>
      {children}
      <AutoSaveIndicator
        status={saveStatus}
        connectionStatus={connectionStatus}
        lastSaveTime={lastSaveTime}
        onRetry={handleRetry}
      />
    </>
  );
};
