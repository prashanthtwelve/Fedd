import type { Profile } from '../domain/model';

export function hasControlCharacters(value: string) {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 32 || (code >= 127 && code <= 159)) {
      return true;
    }
  }
  return false;
}

// Validation does not authenticate a user or retain a secret. PIN verification
// and the Android device credential prompt belong to the native security layer.
export function validateProfileName(name: string): string | null {
  if (!name.trim() || name.trim().length > 60 || hasControlCharacters(name)) {
    return 'Enter your name using 1 to 60 characters.';
  }
  return null;
}

export function makeNameProfile(name: string): Profile {
  const error = validateProfileName(name);
  if (error) {
    throw new Error(error);
  }
  return { name: name.trim() };
}

export function validatePin(pin: string): string | null {
  return /^\d{6,12}$/.test(pin) ? null : 'Use a PIN with 6 to 12 digits.';
}

export function validateBackupPassword(password: string): string | null {
  return password.length >= 10 && password.length <= 128 && password.trim()
    ? null
    : 'Use a backup password with 10 to 128 characters.';
}
