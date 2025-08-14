'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { ColorModeProvider } from '../components/ui/color-mode';
import { AuthProvider } from './contexts/AuthContext';
import { system } from '../lib/theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ColorModeProvider>
    </ChakraProvider>
  );
}
