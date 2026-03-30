'use client';
import { Database } from '@/types/database.types';
import { createCar, updateCar } from '@/app/car/actions';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DatePicker } from '@/components/DatePicker';
import { useRouter } from 'next/navigation';

type CarInsert = Database['public']['Tables']['car']['Insert'];
type CarRow = Pick<
  Database['public']['Tables']['car']['Row'],
  'id' | 'name' | 'buy_at'
>;

type CarFormState = {
  id?: string;
  name: string;
  buyAt?: Date;
};

const toFormState = (value?: CarRow): CarFormState => ({
  id: value?.id ?? undefined,
  name: value?.name ?? '',
  buyAt: value?.buy_at ? new Date(value.buy_at) : undefined,
});

export default function CreateCar(props: {
  defaultValue: CarRow | undefined;
  actionText?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [form, setForm] = useState<CarFormState>(() => toFormState(props.defaultValue));

  useEffect(() => {
    if (open) {
      setForm(toFormState(props.defaultValue));
    }
  }, [open, props.defaultValue]);

  const dialogTitle = props.defaultValue?.id ? '编辑车辆' : '新增车辆';

  const onSubmit = async () => {
    const values: CarInsert = {
      id: form.id,
      name: form.name.trim() || null,
      buy_at: form.buyAt?.toISOString() ?? null,
    };

    setIsPending(true);

    try {
      if (values.id) {
        await updateCar(values);
        toast.success('车辆信息已更新。');
      } else {
        await createCar(values);
        toast.success('车辆已创建。');
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error('save car error==>', error);
      toast.error('保存失败，请稍后重试。');
    } finally {
      setIsPending(false);
    }
  };

  return (
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={props.defaultValue?.id ? 'outline' : 'default'} size={props.defaultValue?.id ? 'sm' : 'default'}>
          {props.actionText || '编辑'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            使用 shadcn 表单编辑车辆信息，保存后列表会自动刷新。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-2">
            <Label htmlFor="car-name">品牌型号</Label>
            <Input
              id="car-name"
              placeholder="例如：比亚迪驱逐舰 05"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="car-buy-at">购买时间</Label>
            <DatePicker
              value={form.buyAt}
              onChange={(buyAt) =>
                setForm((current) => ({
                  ...current,
                  buyAt,
                }))
              }
              placeholder="选择购买日期"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">取消</Button>
          </DialogClose>
          <Button disabled={isPending} onClick={() => void onSubmit()}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
