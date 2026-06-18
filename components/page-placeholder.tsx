'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PagePlaceholderProps {
  title: string;
  description?: string;
  icon: LucideIcon;
}

export function PagePlaceholder({ title, description, icon: Icon }: PagePlaceholderProps) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-text mb-2">{title}</h1>
      {description && <p className="text-text-muted mb-8">{description}</p>}
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Icon size={64} className="mx-auto mb-4 text-accent/40" />
          <p className="text-text-muted">Esta página será implementada em breve</p>
        </div>
      </div>
    </div>
  );
}
