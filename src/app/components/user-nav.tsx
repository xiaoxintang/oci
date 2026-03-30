'use client';

import Link from 'next/link';
import { Activity, Bell, Languages, LogOut, UserRound } from 'lucide-react';
import type { UserProfileSnapshot } from '@/lib/user-profile';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import Logout from './logout';

type UserNavProps = {
  profile: UserProfileSnapshot;
};

function getInitials(text: string) {
  const normalized = text.replace(/^ID:\s*/i, '').trim();

  if (!normalized) {
    return 'U';
  }

  const segments = normalized
    .split(/[\s@._-]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length >= 2) {
    return `${segments[0][0] ?? ''}${segments[1][0] ?? ''}`.toUpperCase();
  }

  return normalized.slice(0, 2).toUpperCase();
}

export default function UserNav({ profile }: UserNavProps) {
  const initials = getInitials(profile.primaryText);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <Button aria-label="语言设置" variant="ghost" size="icon-sm">
        <Languages className="size-4" />
      </Button>

      <Button aria-label="活动" variant="ghost" size="icon-sm">
        <Activity className="size-4" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button aria-label="查看通知" variant="ghost" size="icon-sm">
            <Bell className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end">
          <PopoverHeader>
            <PopoverTitle>通知</PopoverTitle>
            <PopoverDescription>
              暂时没有新的提醒，你可以从头像菜单里进入个人信息页面。
            </PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>

      <Separator
        orientation="vertical"
        className="mx-0.5 hidden h-5 sm:block"
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button aria-label="打开用户菜单" variant="outline" size="sm">
            {initials}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end">
          <PopoverHeader className="min-w-0">
            <PopoverTitle className="truncate">{profile.primaryText}</PopoverTitle>
            <PopoverDescription className="truncate">
              {(profile.secondaryText ?? profile.email) || '已登录账户'}
            </PopoverDescription>
            {profile.phone ? (
              <PopoverDescription className="truncate">
                {profile.phone}
              </PopoverDescription>
            ) : null}
          </PopoverHeader>

          <div className="px-1 py-1">
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link href="/profile">
                <UserRound className="size-4" />
                个人信息
              </Link>
            </Button>
          </div>

          <Separator className="my-1" />

          <div className="px-1 py-1">
            <Logout
              variant="ghost"
              className="w-full justify-start"
              icon={<LogOut className="size-4" />}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
