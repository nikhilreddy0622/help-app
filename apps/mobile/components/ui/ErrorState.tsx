import React from 'react';
import { WifiOff } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { errorMessage } from '@/lib/api';
import { EmptyState } from './EmptyState';

export function ErrorState({ error, onRetry }: { error?: unknown; onRetry: () => void }) {
  return (
    <EmptyState
      icon={<WifiOff size={28} color={colors.textMuted} />}
      title="Could not load this"
      body={error ? errorMessage(error) : 'Please try again.'}
      actionLabel="Try again"
      onAction={onRetry}
    />
  );
}
