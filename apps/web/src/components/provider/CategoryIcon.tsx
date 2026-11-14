import { BookOpen, Briefcase, Building2, Camera, Car, Hammer, GraduationCap, Heart, HeartPulse, Home, Monitor, Paintbrush, PartyPopper, Scissors, Sparkles, Sprout, Wrench, Zap, type LucideIcon } from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  home: Home, 'graduation-cap': GraduationCap, car: Car, 'heart-pulse': HeartPulse, camera: Camera, wrench: Wrench, 'building-2': Building2,
  briefcase: Briefcase, monitor: Monitor, sprout: Sprout, 'party-popper': PartyPopper,
  electrician: Zap, zap: Zap, plumber: Wrench, tutor: BookOpen, 'book-open': BookOpen, driver: Car, photographer: Camera, carpenter: Hammer, hammer: Hammer,
  painter: Paintbrush, paintbrush: Paintbrush, cleaning: Sparkles, sparkles: Sparkles, salon: Scissors, scissors: Scissors, heart: Heart, health: Heart,
};
export function CategoryIcon({ slug, icon, className = 'h-6 w-6' }: { slug: string; icon: string | null; className?: string }) {
  const I = MAP[(icon ?? '').toLowerCase()] ?? MAP[slug.toLowerCase()] ?? Briefcase;
  return <I className={className} aria-hidden />;
}
