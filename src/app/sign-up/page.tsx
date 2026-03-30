'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MailCheck } from 'lucide-react';
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

export default function RegisterPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const sendCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error('请先输入邮箱地址。');
      return;
    }

    setSendingCode(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        // shouldCreateUser: false,
      },
    });
    setSendingCode(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setEmail(normalizedEmail);
    setCodeSent(true);
    toast.success('验证码已发送到邮箱，请查收。');
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();

    if (!normalizedEmail) {
      toast.error('请输入邮箱地址。');
      return;
    }

    if (!normalizedOtp) {
      toast.error('请输入邮箱验证码。');
      return;
    }

    if (password.length < 6) {
      toast.error('密码至少需要 6 位。');
      return;
    }

    setRegistering(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedOtp,
      type: 'email',
    });

    if (verifyError) {
      setRegistering(false);
      toast.error(verifyError.message);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setRegistering(false);

    if (updateError) {
      toast.error(updateError.message);
      return;
    }

    toast.success('注册完成，已为你登录。');
    router.replace('/');
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>邮箱注册</CardTitle>
              <CardDescription>
                输入邮箱发送验证码，再填写验证码和密码完成注册。
              </CardDescription>
            </div>
            <MailCheck className="size-5 text-muted-foreground" />
          </div>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="register-email">邮箱地址</Label>
              <div className="flex gap-2">
                <Input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <Button
                  disabled={sendingCode || registering}
                  onClick={sendCode}
                  type="button"
                  variant="outline"
                >
                  {sendingCode && <Loader2 className="size-4 animate-spin" />}
                  {codeSent ? '重发验证码' : '发送验证码'}
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="register-otp">验证码</Label>
              <Input
                id="register-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="输入邮箱收到的验证码"
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\s/g, ''))
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="register-password">密码</Label>
              <Input
                id="register-password"
                type="password"
                autoComplete="new-password"
                placeholder="至少 6 位"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <Button className="w-full" disabled={registering || sendingCode} type="submit">
              {registering && <Loader2 className="size-4 animate-spin" />}
              注册
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-between text-sm text-muted-foreground">
          <span>已经有账号了？</span>
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            去登录
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
