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
import { formatCurrency, toLocalString, toNumberValue } from '@/lib/time';
import { cn } from '@/lib/utils';

import {
  SUMMARY_FILTER_OPTIONS,
  type DebtSummaryRow,
  type SummaryFilter,
} from '../types';

type SummaryTableProps = {
  activeCounterpartyId: string | null;
  rows: DebtSummaryRow[];
  statusFilter: SummaryFilter;
  onInspectCounterparty: (counterpartyId: string) => void;
  onOpenRepayment: (counterpartyId: string) => void;
  onStatusFilterChange: (value: SummaryFilter) => void;
};

export default function SummaryTable({
  activeCounterpartyId,
  rows,
  statusFilter,
  onInspectCounterparty,
  onOpenRepayment,
  onStatusFilterChange,
}: SummaryTableProps) {
  const emptyText =
    statusFilter === 'settled'
      ? '目前还没有已结清的记录。'
      : statusFilter === 'all'
        ? '暂时还没有账单数据。'
        : '目前还没有未结清的欠款。';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>按人汇总</CardTitle>
        <div className="flex flex-wrap gap-2">
          {SUMMARY_FILTER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={statusFilter === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onStatusFilterChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>债务人</TableHead>
              <TableHead>借出总额</TableHead>
              <TableHead>已还总额</TableHead>
              <TableHead>待还金额</TableHead>
              <TableHead>最近交易时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => {
                const outstandingAmount = toNumberValue(row.outstanding_amount);
                const isActive = activeCounterpartyId === row.counterparty_id;

                return (
                  <TableRow
                    key={row.counterparty_id}
                    className={cn(isActive && 'bg-muted/40')}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{row.counterparty_name}</span>
                        {outstandingAmount <= 0 ? (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                            已结清
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(row.loan_total)}</TableCell>
                    <TableCell>{formatCurrency(row.repaid_total)}</TableCell>
                    <TableCell
                      className={cn(
                        'font-medium',
                        outstandingAmount > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400',
                      )}
                    >
                      {formatCurrency(outstandingAmount)}
                    </TableCell>
                    <TableCell>{toLocalString(row.last_occurred_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant={isActive ? 'default' : 'outline'}
                          onClick={() => onInspectCounterparty(row.counterparty_id)}
                        >
                          看流水
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={outstandingAmount <= 0}
                          onClick={() => onOpenRepayment(row.counterparty_id)}
                        >
                          登记还款
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
