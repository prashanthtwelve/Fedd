import React from 'react';
import {
  BookOpen,
  Camera,
  ChefHat,
  Clapperboard,
  Code,
  Dumbbell,
  Gamepad2,
  Music,
  Palette,
  PenLine,
  Plane,
  Scissors,
  Sparkles,
} from 'lucide-react-native';
import { colors } from '../theme';
const icons = {
  movie: Clapperboard,
  scissors: Scissors,
  camera: Camera,
  music: Music,
  gamepad: Gamepad2,
  code: Code,
  sparkles: Sparkles,
  pen: PenLine,
  palette: Palette,
  fitness: Dumbbell,
  plane: Plane,
  chef: ChefHat,
  book: BookOpen,
};
export function InterestIcon({
  name,
  size = 24,
  color = colors.primaryContainer,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const Icon = icons[name as keyof typeof icons] ?? Sparkles;
  return <Icon size={size} color={color} />;
}
