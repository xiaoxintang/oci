import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ProfileForm from './profile-form';
import { createServerSupabase } from '@/lib/supabase/server';
import { getUserProfileSnapshot } from '@/lib/user-profile';

export const metadata: Metadata = {
  title: '个人信息',
  description: '修改当前登录用户的个人信息',
};

export default async function ProfilePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const profile = getUserProfileSnapshot(user);

  return (
    <div className="min-h-screen py-6">
      <div className="mx-auto max-w-3xl">
        <ProfileForm
          initialValues={{
            name: profile.name,
            fullName: profile.fullName,
            nickname: profile.nickname,
            email: profile.email,
            phone: profile.phone,
          }}
        />
      </div>
    </div>
  );
}
