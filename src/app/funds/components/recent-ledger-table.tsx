'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, toLocalString } from '@/lib/time';
import { cn } from '@/lib/utils';

import {
  ENTRY_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  type LedgerEntryRow,
} from '../types';

type RecentLedgerTableProps = {
  activeCounterpartyName: string | null;
  ledgerRows: LedgerEntryRow[];
  onClearCounterparty: () => void;
  onEditLedgerEntry: (entry: LedgerEntryRow) => void;
};

export default function RecentLedgerTable({
  activeCounterpartyName,
  ledgerRows,
  onClearCounterparty,
  onEditLedgerEntry,
}: RecentLedgerTableProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle>最近流水</CardTitle>
          {activeCounterpartyName ? (
            <p className="text-sm text-muted-foreground">
              当前仅查看 {activeCounterpartyName} 的流水。
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              展示最近录入的借出与回款记录。
            </p>
          )}
        </div>
        {activeCounterpartyName ? (
          <Button size="sm" variant="outline" onClick={onClearCounterparty}>
            清除筛选
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>债务人</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>金额</TableHead>
              <TableHead>支付方式</TableHead>
              <TableHead>截图</TableHead>
              <TableHead>备注</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledgerRows.length ? (
              ledgerRows.map((row) => {
                const isLoan = row.entry_type === 'loan';

                return (
                  <TableRow key={row.id}>
                    <TableCell>{toLocalString(row.occurred_at)}</TableCell>
                    <TableCell className="font-medium">
                      {row.counterparty_name}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs',
                          isLoan
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                        )}
                      >
                        {ENTRY_TYPE_LABELS[row.entry_type]}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        'font-medium',
                        isLoan
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400',
                      )}
                    >
                      {formatCurrency(row.amount)}
                    </TableCell>
                    <TableCell>
                      {PAYMENT_METHOD_LABELS[row.payment_method]}
                    </TableCell>
                    <TableCell>
                      {row.screenshot_url ? (
                        <a
                          className="text-sm text-primary underline-offset-4 hover:underline"
                          href={row.screenshot_url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          查看截图
                        </a>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-72 whitespace-normal break-words text-sm text-muted-foreground">
                      {row.note || '--'}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditLedgerEntry(row)}
                        >
                          编辑
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  还没有符合当前筛选条件的流水。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
