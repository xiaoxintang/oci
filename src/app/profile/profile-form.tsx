'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createBrowserSupabase } from '@/lib/supabase/client';

type ProfileFormValues = {
  name: string;
  fullName: string;
  nickname: string;
  email: string;
  phone: string;
};

type ProfileFormProps = {
  initialValues: ProfileFormValues;
};

const normalizeText = (value: string) => value.trim();

export default function ProfileForm({ initialValues }: ProfileFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [form, setForm] = useState(initialValues);
  const [savedValues, setSavedValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);

  const hasChanges =
    form.name !== savedValues.name ||
    form.fullName !== savedValues.fullName ||
    form.nickname !== savedValues.nickname;

  const updateField =
    (field: keyof ProfileFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    const nextValues = {
      name: normalizeText(form.name),
      fullName: normalizeText(form.fullName),
      nickname: normalizeText(form.nickname),
      email: savedValues.email,
      phone: savedValues.phone,
    };

    const { error } = await supabase.auth.updateUser({
      data: {
        name: nextValues.name || null,
        full_name: nextValues.fullName || null,
        nickname: nextValues.nickname || null,
      },
    });

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setForm(nextValues);
    setSavedValues(nextValues);
    toast.success('个人信息已更新。');
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft className="size-4" />
                返回首页
              </Link>
            </Button>
            <CardTitle>修改个人信息</CardTitle>
            <CardDescription>
              这里会更新你的 Supabase 账户资料，保存后顶部 layout 中的当前用户信息会同步刷新。
            </CardDescription>
          </div>
          <UserRound className="size-5 text-muted-foreground" />
        </div>
      </CardHeader>

      <CardContent>
        <form className="space-y-6" id="profile-form" onSubmit={submit}>
          <section className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="profile-name">常用名称</Label>
              <Input
                id="profile-name"
                placeholder="例如：Longan"
                value={form.name}
                onChange={updateField('name')}
              />
              <p className="text-xs text-muted-foreground">
                layout 优先展示这个字段，适合放你平时想看到的名字。
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="profile-full-name">完整姓名</Label>
              <Input
                id="profile-full-name"
                placeholder="例如：张三"
                value={form.fullName}
                onChange={updateField('fullName')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="profile-nickname">昵称</Label>
              <Input
                id="profile-nickname"
                placeholder="例如：阿龙"
                value={form.nickname}
                onChange={updateField('nickname')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="profile-email">邮箱地址</Label>
              <Input
                id="profile-email"
                value={form.email || '未绑定邮箱'}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                当前页面先支持展示邮箱，后续如果你想改邮箱或密码，我也可以一起补上。
              </p>
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="profile-phone">手机号</Label>
              <Input
                id="profile-phone"
                value={form.phone || '未绑定手机号'}
                disabled
              />
            </div>
          </section>
        </form>
      </CardContent>

      <CardFooter className="justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          保存后会立即刷新顶部用户展示信息。
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/">取消</Link>
          </Button>
          <Button
            disabled={saving || !hasChanges}
            form="profile-form"
            type="submit"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            保存修改
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
