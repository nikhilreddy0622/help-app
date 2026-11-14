import React from 'react';
import { Briefcase, Building2, Camera, Car, GraduationCap, HeartPulse, Home, Monitor, MoreHorizontal, PartyPopper, Sprout, Wrench, type LucideIcon } from 'lucide-react-native';
import { colors } from '@/lib/theme';

const ICONS: Record<string, LucideIcon> = {
  home: Home, 'graduation-cap': GraduationCap, car: Car, 'heart-pulse': HeartPulse, camera: Camera, wrench: Wrench,
  'building-2': Building2, briefcase: Briefcase, monitor: Monitor, sprout: Sprout, 'party-popper': PartyPopper, dots: MoreHorizontal,
};

/** Maps the server's lucide icon name to an icon, falling back to a briefcase. */
export function CatIcon({ name, size = 26, color = colors.teal }: { name?: string | null; size?: number; color?: string }) {
  const Icon = (name ? ICONS[name] : undefined) ?? Briefcase;
  return <Icon size={size} color={color} />;
}
