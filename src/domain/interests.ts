import { copy } from '../copy';
import { hasControlCharacters } from '../services/auth';
export type Interest = {
  id: string;
  name: string;
  icon: string;
  isCustom: boolean;
};
const icons = [
  'movie',
  'scissors',
  'camera',
  'music',
  'gamepad',
  'code',
  'sparkles',
  'pen',
  'palette',
  'fitness',
  'plane',
  'chef',
  'book',
];
export const PRESETS: Interest[] = copy.interests.map((name, i) => ({
  id: `preset-${i}`,
  name,
  icon: icons[i],
  isCustom: false,
}));
export function pickerValid(ids: string[]) {
  return (
    ids.length >= 3 &&
    ids.length <= 5 &&
    new Set(ids).size === ids.length &&
    ids.every(id => PRESETS.some(p => p.id === id))
  );
}
export function togglePreset(ids: string[], id: string) {
  if (!PRESETS.some(p => p.id === id)) {
    return ids;
  }
  return ids.includes(id)
    ? ids.filter(item => item !== id)
    : ids.length < 5
    ? [...ids, id]
    : ids;
}
export function savePresets(saved: Interest[], ids: string[]) {
  if (!pickerValid(ids)) {
    throw new Error(copy.picker.subtitle);
  }
  return [
    ...PRESETS.filter(p => ids.includes(p.id)),
    ...saved.filter(p => p.isCustom),
  ];
}
export function validateCustom(name: string, saved: Interest[]) {
  const normalized = name.trim();
  if (hasControlCharacters(name)) {
    return copy.custom.invalidName;
  }
  if (!normalized) {
    return copy.custom.empty;
  }
  if (normalized.length > 24) {
    return copy.custom.long;
  }
  if (
    [...saved, ...PRESETS].some(
      p => p.name.toLowerCase() === normalized.toLowerCase(),
    )
  ) {
    return copy.custom.duplicate;
  }
  if (saved.filter(p => p.isCustom).length >= 10) {
    return copy.custom.limit;
  }
  return null;
}
export function toggleSession(ids: string[], id: string) {
  if (ids.includes(id)) {
    return ids.filter(item => item !== id);
  }
  if (ids.length >= 3) {
    return ids;
  }
  return [...ids, id];
}
export function selectNewCustom(ids: string[], id: string) {
  return [...ids.slice(0, 2), id];
}
export function joinInterests(names: string[]) {
  return names.length <= 1
    ? names[0] ?? ''
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
