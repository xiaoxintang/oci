import type { User } from '@supabase/supabase-js';

const readMetadataText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

export type UserProfileSnapshot = {
  name: string;
  fullName: string;
  nickname: string;
  email: string;
  phone: string;
  primaryText: string;
  secondaryText: string | null;
};

export function getUserProfileSnapshot(
  user: User | null | undefined,
): UserProfileSnapshot {
  const name = readMetadataText(user?.user_metadata?.name);
  const fullName = readMetadataText(user?.user_metadata?.full_name);
  const nickname = readMetadataText(user?.user_metadata?.nickname);
  const email = readMetadataText(user?.email);
  const phone = readMetadataText(user?.phone);
  const profileName = [name, fullName, nickname].find(Boolean) ?? '';

  return {
    name,
    fullName,
    nickname,
    email,
    phone,
    primaryText:
      profileName || email || phone || (user ? `ID: ${user.id.slice(0, 8)}` : ''),
    secondaryText: profileName ? email || phone || null : null,
  };
}
