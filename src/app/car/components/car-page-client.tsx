'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { BellRing, CarFront, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { createCar } from '@/app/car/actions';
import {
  CAR_ENERGY_LABELS,
  CAR_ENERGY_OPTIONS,
  type CarFormValues,
  type CarRow,
} from '@/app/car/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatKilometers, toDateInputValue } from '@/lib/time';

import { type CarReminderWithState } from '@/lib/car/reminders';

const selectClassName =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';

const createInitialCarFormValues = (): CarFormValues => ({
  buyAt: toDateInputValue(new Date()),
  currentEngineKm: '',
  currentEvKm: '',
  energyType: 'fuel',
  name: '',
  note: '',
  plateNumber: '',
});

type CarPageClientProps = {
  cars: CarRow[];
  reminders: CarReminderWithState[];
};

export default function CarPageClient({
  cars,
  reminders,
}: CarPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CarFormValues>(
    createInitialCarFormValues,
  );

  const openReminderCount = reminders.filter(
    (row) => !row.acknowledged_at && !row.resolved_at,
  ).length;

  const carReminderCountMap = useMemo(() => {
    const nextMap = new Map<string, number>();

    for (const reminder of reminders) {
      if (reminder.acknowledged_at || reminder.resolved_at) {
        continue;
      }

      nextMap.set(
        reminder.car_id,
        (nextMap.get(reminder.car_id) ?? 0) + 1,
      );
    }

    return nextMap;
  }, [reminders]);

  const onCreateCar = () => {
    startTransition(() => {
      void (async () => {
        try {
          const result = await createCar(createForm);

          toast.success('车辆已创建。');
          setCreateDialogOpen(false);
          setCreateForm(createInitialCarFormValues());
          router.push(`/car/${result.carId}`);
          router.refresh();
        } catch (error) {
          console.error('create car error==>', error);
          toast.error(
            error instanceof Error ? error.message : '创建车辆失败，请稍后再试。',
          );
        }
      })();
    });
  };

  return (
    <div className="space-y-6 py-6">
      <section className="flex flex-col gap-4 rounded-3xl border bg-card px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">车辆管理</p>
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight">车辆、保险与保养</h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                记录发动机里程与纯电里程，系统会自动推导总里程，并按保险与保养周期给出提醒。
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="size-4" />
            新建车辆
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>车辆总数</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CarFront className="size-5 text-muted-foreground" />
              {cars.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>待处理提醒</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <BellRing className="size-5 text-muted-foreground" />
              {openReminderCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>最近更新里程车辆</CardDescription>
            <CardTitle className="text-2xl">
              {cars[0]?.name ?? '--'}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>待处理提醒</CardTitle>
          <CardDescription>已逾期、30 天内到期或 100 公里内到期的车辆事项</CardDescription>
        </CardHeader>
        <CardContent>
          {reminders.length ? (
            <div className="space-y-3">
              {reminders.slice(0, 10).map((reminder) => (
                <div
                  key={reminder.reminder_key}
                  className="flex flex-col gap-2 rounded-2xl border px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {reminder.car_name}
                      {reminder.plate_number ? ` · ${reminder.plate_number}` : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {reminder.title}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-1">
                      {reminder.severity}
                    </span>
                    <span>
                      {reminder.due_at
                        ? `时间：${reminder.due_at.slice(0, 10)}`
                        : '无时间阈值'}
                    </span>
                    {typeof reminder.due_km === 'number' ? (
                      <span>里程：{formatKilometers(reminder.due_km)}</span>
                    ) : null}
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/car/${reminder.car_id}`}>查看详情</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              当前没有需要处理的车辆提醒。
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>车辆列表</CardTitle>
          <CardDescription>点击任意车辆可进入详情页继续录入里程、保险和保养</CardDescription>
        </CardHeader>
        <CardContent>
          {cars.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>车辆</TableHead>
                  <TableHead>能源类型</TableHead>
                  <TableHead>发动机里程</TableHead>
                  <TableHead>纯电里程</TableHead>
                  <TableHead>总里程</TableHead>
                  <TableHead>待处理提醒</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cars.map((car) => (
                  <TableRow key={car.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{car.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {car.plate_number || '未设置车牌'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{CAR_ENERGY_LABELS[car.energy_type]}</TableCell>
                    <TableCell>{formatKilometers(car.current_engine_km)}</TableCell>
                    <TableCell>{formatKilometers(car.current_ev_km)}</TableCell>
                    <TableCell>{formatKilometers(car.current_total_km)}</TableCell>
                    <TableCell>{carReminderCountMap.get(car.id) ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/car/${car.id}`}>查看详情</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              还没有车辆，先创建一台车开始使用。
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>新建车辆</DialogTitle>
            <DialogDescription>
              录入车辆基本信息和当前累计里程，系统会按发动机里程与纯电里程自动推导总里程。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="car-name" className="text-sm font-medium">
                  车辆名称
                </label>
                <Input
                  id="car-name"
                  placeholder="例如：Model Y / 卡罗拉"
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="car-plate-number" className="text-sm font-medium">
                  车牌号
                </label>
                <Input
                  id="car-plate-number"
                  placeholder="例如：沪A12345"
                  value={createForm.plateNumber}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      plateNumber: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="car-energy-type" className="text-sm font-medium">
                  能源类型
                </label>
                <select
                  id="car-energy-type"
                  className={selectClassName}
                  value={createForm.energyType}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      energyType: event.target.value as CarFormValues['energyType'],
                      currentEngineKm:
                        event.target.value === 'electric' ? '0' : current.currentEngineKm,
                      currentEvKm:
                        event.target.value === 'fuel' ? '0' : current.currentEvKm,
                    }))
                  }
                >
                  {CAR_ENERGY_OPTIONS.map((energyType) => (
                    <option key={energyType} value={energyType}>
                      {CAR_ENERGY_LABELS[energyType]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label htmlFor="car-buy-at" className="text-sm font-medium">
                  购车日期
                </label>
                <Input
                  id="car-buy-at"
                  type="date"
                  value={createForm.buyAt}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      buyAt: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="car-current-engine-km" className="text-sm font-medium">
                  发动机里程
                </label>
                <Input
                  id="car-current-engine-km"
                  type="number"
                  min="0"
                  step="0.1"
                  value={createForm.currentEngineKm}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      currentEngineKm: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="car-current-ev-km" className="text-sm font-medium">
                  纯电里程
                </label>
                <Input
                  id="car-current-ev-km"
                  type="number"
                  min="0"
                  step="0.1"
                  value={createForm.currentEvKm}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      currentEvKm: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="car-note" className="text-sm font-medium">
                备注
              </label>
              <Textarea
                id="car-note"
                placeholder="记录车辆说明、使用场景等"
                value={createForm.note}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={onCreateCar} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              创建车辆
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
