'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { deleteCar } from '../actions';
import { useRouter } from 'next/navigation';

export default function DeleteCar(props: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const onDelete = async () => {
    setIsPending(true);

    try {
      await deleteCar(props.id);
      toast.success('车辆已删除。');
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error('delete car error==>', error);
      toast.error('删除失败，请稍后重试。');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          删除
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>删除车辆</DialogTitle>
          <DialogDescription>
            这项操作无法撤销。确认后会立即删除这条车辆记录。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">取消</Button>
          </DialogClose>
          <Button variant="destructive" disabled={isPending} onClick={() => void onDelete()}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            确认删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
