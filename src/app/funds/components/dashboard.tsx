'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrency, toNumberValue } from '@/lib/time';

import { type DebtSummaryRow } from '../types';

type DashboardProps = {
  summaryRows: DebtSummaryRow[];
};

export default function Dashboard({ summaryRows }: DashboardProps) {
  const totalLoan = summaryRows.reduce(
    (sum, row) => sum + toNumberValue(row.loan_total),
    0,
  );
  const totalRepaid = summaryRows.reduce(
    (sum, row) => sum + toNumberValue(row.repaid_total),
    0,
  );
  const totalOutstanding = summaryRows.reduce(
    (sum, row) => sum + toNumberValue(row.outstanding_amount),
    0,
  );
  const openCounterpartyCount = summaryRows.filter(
    (row) => toNumberValue(row.outstanding_amount) > 0,
  ).length;
  const topRows = [...summaryRows]
    .filter((row) => toNumberValue(row.outstanding_amount) > 0)
    .sort(
      (left, right) =>
        toNumberValue(right.outstanding_amount) -
        toNumberValue(left.outstanding_amount),
    )
    .slice(0, 5);
  const maxOutstanding = Math.max(
    ...topRows.map((row) => toNumberValue(row.outstanding_amount)),
    1,
  );

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>借出总额</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalLoan)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>已回款总额</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalRepaid)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>待收总额</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalOutstanding)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-2">
            <CardDescription>欠款人数</CardDescription>
            <CardTitle className="text-2xl">{openCounterpartyCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>欠款排行</CardTitle>
          <CardDescription>按当前待还金额展示前 5 名</CardDescription>
        </CardHeader>
        <CardContent>
          {topRows.length ? (
            <div className="space-y-4">
              {topRows.map((row) => {
                const outstanding = toNumberValue(row.outstanding_amount);
                const width = `${Math.max(
                  (outstanding / maxOutstanding) * 100,
                  12,
                )}%`;

                return (
                  <div key={row.counterparty_id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">
                        {row.counterparty_name}
                      </span>
                      <span className="text-muted-foreground">
                        {formatCurrency(outstanding)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              目前还没有未结清的欠款，排行会在录入借出后自动出现。
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
