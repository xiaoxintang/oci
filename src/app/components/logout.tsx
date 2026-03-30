'use client';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { VariantProps } from 'class-variance-authority';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { buttonVariants } from '@/components/ui/button';

type LogoutProps = {
  className?: string;
  icon?: ReactNode;
  label?: string;
} & VariantProps<typeof buttonVariants>;

export default function Logout({
  className,
  icon,
  label = '退出登录',
  size,
  variant,
}: LogoutProps) {
  const supabase = createBrowserSupabase();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      className={className}
      disabled={loading}
      size={size}
      onClick={async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setLoading(false);
        window.location.href = '/sign-in';
      }}
      variant={variant}
    >
      {!loading && icon}
      {loading && <Spinner data-icon="inline-start" />}
      {label}
    </Button>
  );
}
