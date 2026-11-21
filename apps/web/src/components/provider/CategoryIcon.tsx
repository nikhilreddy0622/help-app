import {
  Accessibility, Baby, Briefcase, Building, Building2, Camera, Car, Castle, ChefHat, Cpu, Database, DraftingCompass, Droplets, Drum, Factory,
  FileCheck, Fish, FlaskConical, Flower2, Forklift, GraduationCap, Hammer, HandHeart, HardHat, HeartPulse, Home, Hotel, KeyRound, Landmark,
  Languages, Leaf, LifeBuoy, Lightbulb, Luggage, Megaphone, Microscope, Monitor, Package, Palette, PartyPopper, PawPrint, Pickaxe,
  Plane, Presentation, Printer, Radio, RadioTower, Ruler, Scale, Scissors, ShieldCheck, Shirt, ShoppingCart, Sparkles, Sprout, Sun, Target,
  Trees, Trophy, Truck, UserCheck, Warehouse, Wifi, Wrench, type LucideIcon,
} from 'lucide-react';

// Keys match the icon names written by the catalog import (services/api/src/scripts/import-catalog.ts).
const MAP: Record<string, LucideIcon> = {
  accessibility: Accessibility, sprout: Sprout, 'drafting-compass': DraftingCompass, car: Car, plane: Plane, scissors: Scissors,
  briefcase: Briefcase, target: Target, baby: Baby, 'file-check': FileCheck, 'hard-hat': HardHat, presentation: Presentation,
  'shopping-cart': ShoppingCart, megaphone: Megaphone, 'life-buoy': LifeBuoy, 'graduation-cap': GraduationCap, cpu: Cpu, sun: Sun, leaf: Leaf,
  'party-popper': PartyPopper, building: Building, shirt: Shirt, landmark: Landmark, 'chef-hat': ChefHat, 'flower-2': Flower2, trees: Trees,
  palette: Palette, 'heart-pulse': HeartPulse, castle: Castle, home: Home, hotel: Hotel, monitor: Monitor, factory: Factory,
  'flask-conical': FlaskConical, languages: Languages, scale: Scale, warehouse: Warehouse, fish: Fish, radio: Radio, pickaxe: Pickaxe,
  printer: Printer, package: Package, 'user-check': UserCheck, 'paw-print': PawPrint, camera: Camera, 'building-2': Building2,
  'key-round': KeyRound, forklift: Forklift, wrench: Wrench, database: Database, microscope: Microscope, 'shield-check': ShieldCheck,
  'hand-heart': HandHeart, lightbulb: Lightbulb, sparkles: Sparkles, trophy: Trophy, wifi: Wifi, 'radio-tower': RadioTower, ruler: Ruler,
  drum: Drum, hammer: Hammer, truck: Truck, luggage: Luggage, droplets: Droplets,
};

export function CategoryIcon({ slug, icon, className = 'h-6 w-6', strokeWidth = 1.9 }: { slug: string; icon: string | null; className?: string; strokeWidth?: number }) {
  const I = MAP[(icon ?? '').toLowerCase()] ?? MAP[slug.toLowerCase()] ?? Briefcase;
  return <I className={className} strokeWidth={strokeWidth} aria-hidden />;
}
