'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import Upload from '@/components/upload';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, toDateTimeLocalValue, toNumberValue } from '@/lib/time';

import { createLedgerEntry, updateLedgerEntry } from '../actions';
import {
  ENTRY_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_OPTIONS,
  type CounterpartyOption,
  type DebtSummaryRow,
  type LedgerDialogMode,
  type LedgerEntryRow,
  type LedgerEntryType,
  type LedgerFormValues,
} from '../types';

type RecordEntryDialogProps = {
  counterparties: CounterpartyOption[];
  defaultCounterpartyId?: string;
  defaultEntryType: LedgerEntryType;
  initialEntry?: LedgerEntryRow;
  mode: LedgerDialogMode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  summaryRows: DebtSummaryRow[];
};

const entryTypeOptions: LedgerEntryType[] = ['loan', 'repayment'];

const selectClassName =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';

const createInitialFormValues = (
  defaultEntryType: LedgerEntryType,
  defaultCounterpartyId?: string,
  initialEntry?: LedgerEntryRow,
): LedgerFormValues => ({
  entryType: initialEntry?.entry_type ?? defaultEntryType,
  counterpartyId: initialEntry?.counterparty_id ?? defaultCounterpartyId ?? '',
  counterpartyName: '',
  amount: initialEntry ? String(initialEntry.amount) : '',
  occurredAt: initialEntry
    ? toDateTimeLocalValue(initialEntry.occurred_at)
    : toDateTimeLocalValue(new Date()),
  paymentMethod: initialEntry?.payment_method ?? 'wechat',
  screenshotUrl: initialEntry?.screenshot_url ?? '',
  screenshotKey: initialEntry?.screenshot_key ?? '',
  note: initialEntry?.note ?? '',
});

export default function RecordEntryDialog({
  counterparties,
  defaultCounterpartyId,
  defaultEntryType,
  initialEntry,
  mode,
  onOpenChange,
  open,
  summaryRows,
}: RecordEntryDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<LedgerFormValues>(() =>
    createInitialFormValues(defaultEntryType, defaultCounterpartyId, initialEntry),
  );

  const resolvedCounterparty = form.counterpartyId
    ? counterparties.find((item) => item.id === form.counterpartyId) ?? null
    : counterparties.find(
          (item) =>
            item.name.trim().toLocaleLowerCase() ===
            form.counterpartyName.trim().toLocaleLowerCase(),
        ) ?? null;

  const matchedSummary = resolvedCounterparty?.id
    ? summaryRows.find((row) => row.counterparty_id === resolvedCounterparty.id) ??
      null
    : null;

  const outstandingAmount = toNumberValue(matchedSummary?.outstanding_amount);
  const initialEntryAmount = toNumberValue(initialEntry?.amount);
  const previousDeltaForSelectedCounterparty =
    initialEntry && resolvedCounterparty?.id === initialEntry.counterparty_id
      ? initialEntry.entry_type === 'loan'
        ? initialEntryAmount
        : -initialEntryAmount
      : 0;
  const repaymentCapacity =
    outstandingAmount - previousDeltaForSelectedCounterparty;

  const helperText =
    form.entryType === 'repayment'
      ? resolvedCounterparty
        ? mode === 'edit'
          ? `当前最多可改为：${formatCurrency(
              Math.max(repaymentCapacity, 0),
            )}`
          : `当前待还：${formatCurrency(outstandingAmount)}`
        : '登记还款时，请先选择已有欠款人。'
      : '可以直接选择已有债务人，或输入新名字后自动创建。';

  const validateForm = () => {
    const amount = toNumberValue(form.amount);

    if (!resolvedCounterparty && !form.counterpartyName.trim()) {
      return '请先选择债务人，或者输入新的债务人姓名。';
    }

    if (amount <= 0) {
      return '请输入大于 0 的金额。';
    }

    if (!form.occurredAt) {
      return '请选择交易时间。';
    }

    if (form.entryType === 'repayment') {
      if (!resolvedCounterparty) {
        return '登记还款时必须选择已有欠款人。';
      }

      if (repaymentCapacity <= 0) {
        return '该债务人当前没有待还金额。';
      }

      if (Math.round(amount * 100) > Math.round(repaymentCapacity * 100)) {
        return '还款金额不能超过当前待还金额。';
      }
    }

    return null;
  };

  const onSubmit = () => {
    const validationMessage = validateForm();

    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const submitValues = {
            ...form,
            counterpartyId: resolvedCounterparty?.id ?? form.counterpartyId,
          };

          if (mode === 'edit' && initialEntry) {
            await updateLedgerEntry(initialEntry.id, submitValues);
          } else {
            await createLedgerEntry(submitValues);
          }

          toast.success(
            mode === 'edit'
              ? '流水已更新。'
              : form.entryType === 'loan'
                ? '借出记录已录入。'
                : '还款记录已录入。',
          );
          onOpenChange(false);
          router.refresh();
        } catch (error) {
          console.error('save ledger entry error==>', error);
          toast.error(
            error instanceof Error ? error.message : '保存失败，请稍后再试。',
          );
        }
      })();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? '编辑流水' : '录入账单'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? '修改后会重新计算该债务人的待还金额，请留意金额和债务人是否正确。'
              : '记录借出和回款，系统会自动按债务人汇总待还金额。'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-2">
            <Label>账单类型</Label>
            <div className="flex flex-wrap gap-2">
              {entryTypeOptions.map((entryType) => (
                <Button
                  key={entryType}
                  type="button"
                  variant={form.entryType === entryType ? 'default' : 'outline'}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      entryType,
                    }))
                  }
                >
                  {ENTRY_TYPE_LABELS[entryType]}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="fund-counterparty-select">选择已有债务人</Label>
              <select
                id="fund-counterparty-select"
                className={selectClassName}
                value={form.counterpartyId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    counterpartyId: event.target.value,
                    counterpartyName: event.target.value ? '' : current.counterpartyName,
                  }))
                }
              >
                <option value="">不选择，改为新建</option>
                {counterparties.map((counterparty) => (
                  <option key={counterparty.id} value={counterparty.id}>
                    {counterparty.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fund-counterparty-name">新建债务人</Label>
              <Input
                id="fund-counterparty-name"
                placeholder="例如：张三"
                value={form.counterpartyName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    counterpartyId: event.target.value.trim() ? '' : current.counterpartyId,
                    counterpartyName: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{helperText}</p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="fund-amount">金额</Label>
              <Input
                id="fund-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fund-occurred-at">交易时间</Label>
              <Input
                id="fund-occurred-at"
                type="datetime-local"
                value={form.occurredAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    occurredAt: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="grid gap-2">
              <Label htmlFor="fund-payment-method">支付方式</Label>
              <select
                id="fund-payment-method"
                className={selectClassName}
                value={form.paymentMethod}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    paymentMethod: event.target.value as LedgerFormValues['paymentMethod'],
                  }))
                }
              >
                {PAYMENT_METHOD_OPTIONS.map((paymentMethod) => (
                  <option key={paymentMethod} value={paymentMethod}>
                    {PAYMENT_METHOD_LABELS[paymentMethod]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label>交易截图</Label>
              <Upload
                initialUrl={form.screenshotUrl || undefined}
                onChange={(uploadResult) =>
                  setForm((current) => ({
                    ...current,
                    screenshotUrl: uploadResult.url,
                    screenshotKey: uploadResult.key ?? '',
                  }))
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="fund-note">备注</Label>
            <Textarea
              id="fund-note"
              placeholder="补充说明，例如这笔钱的用途、约定还款时间等。"
              value={form.note}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">取消</Button>
          </DialogClose>
          <Button disabled={isPending} onClick={onSubmit}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === 'edit' ? '保存修改' : '保存账单'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
