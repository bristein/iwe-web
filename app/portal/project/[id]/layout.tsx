'use client';

import React from 'react';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  // This layout replaces the portal layout for project pages
  // It renders children directly without any additional wrapper
  return <>{children}</>;
}
