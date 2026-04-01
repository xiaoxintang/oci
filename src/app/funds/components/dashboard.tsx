'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrency, toNumberValue } from '@/lib/time';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from 'recharts';

import { type DebtSummaryRow } from '../types';

type DashboardProps = {
  summaryRows: DebtSummaryRow[];
};

const PIE_COLORS = [
  '#2563eb',
  '#0f766e',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#65a30d',
  '#db2777',
  '#ea580c',
  '#4f46e5',
];

const shareFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type OutstandingSlice = {
  color: string;
  counterparty_id: string;
  counterparty_name: string;
  outstanding: number;
  ratio: number;
};

function buildOutstandingSlices(summaryRows: DebtSummaryRow[]) {
  const openRows = [...summaryRows]
    .map((row) => ({
      ...row,
      outstanding: toNumberValue(row.outstanding_amount),
    }))
    .filter((row) => row.outstanding > 0)
    .sort((left, right) => right.outstanding - left.outstanding);

  const totalOutstanding = openRows.reduce(
    (sum, row) => sum + row.outstanding,
    0,
  );

  if (!totalOutstanding) {
    return [];
  }

  return openRows.map<OutstandingSlice>((row, index) => {
    return {
      color: PIE_COLORS[index % PIE_COLORS.length],
      counterparty_id: row.counterparty_id,
      counterparty_name: row.counterparty_name,
      outstanding: row.outstanding,
      ratio: row.outstanding / totalOutstanding,
    };
  });
}

function OutstandingTooltip({
  active,
  payload,
}: TooltipContentProps) {
  const slice = payload?.[0]?.payload as OutstandingSlice | undefined;

  if (!active || !slice) {
    return null;
  }

  return (
    <div className="rounded-2xl border bg-card px-3 py-2 shadow-lg">
      <p className="text-sm font-medium">{slice.counterparty_name}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        金额 {formatCurrency(slice.outstanding)}
      </p>
      <p className="text-sm text-muted-foreground">
        占比 {shareFormatter.format(slice.ratio)}
      </p>
    </div>
  );
}

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
  const outstandingSlices = buildOutstandingSlices(summaryRows);
  const topRows = outstandingSlices.slice(0, 5);
  const maxOutstanding = Math.max(
    ...topRows.map((row) => row.outstanding),
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

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.3fr]">
        <Card>
          <CardHeader>
            <CardTitle>欠款排行</CardTitle>
            <CardDescription>按当前待还金额展示前 5 名</CardDescription>
          </CardHeader>
          <CardContent>
            {topRows.length ? (
              <div className="space-y-4">
                {topRows.map((row) => {
                  const width = `${Math.max(
                    (row.outstanding / maxOutstanding) * 100,
                    12,
                  )}%`;

                  return (
                    <div key={row.counterparty_id} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium">
                          {row.counterparty_name}
                        </span>
                        <span className="text-muted-foreground">
                          {formatCurrency(row.outstanding)}
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

        <Card>
          <CardHeader>
            <CardTitle>欠款占比</CardTitle>
            <CardDescription>按每个人当前待还金额展示占比</CardDescription>
          </CardHeader>
          <CardContent>
            {outstandingSlices.length ? (
              <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-center">
                <div className="flex justify-center">
                  <div className="relative aspect-square w-full max-w-[240px]">
                    <div className="absolute inset-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={outstandingSlices}
                            cx="50%"
                            cy="50%"
                            dataKey="outstanding"
                            innerRadius="62%"
                            nameKey="counterparty_name"
                            outerRadius="100%"
                            paddingAngle={2}
                            stroke="var(--color-background)"
                            strokeWidth={2}
                          >
                            {outstandingSlices.map((slice) => (
                              <Cell
                                key={slice.counterparty_id}
                                fill={slice.color}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            content={OutstandingTooltip}
                            cursor={false}
                            wrapperStyle={{ zIndex: 30 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="pointer-events-none absolute inset-[22%] z-10 flex flex-col items-center justify-center rounded-full border border-border bg-card text-center shadow-sm">
                      <span className="text-xs text-muted-foreground">
                        待收总额
                      </span>
                      <span className="mt-1 px-3 text-base font-semibold sm:text-lg">
                        {formatCurrency(totalOutstanding)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 lg:max-h-[320px] lg:overflow-y-auto lg:pr-1">
                  {outstandingSlices.map((slice) => (
                    <div
                      key={slice.counterparty_id}
                      className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/20 px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: slice.color }}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {slice.counterparty_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            占待收总额 {shareFormatter.format(slice.ratio)}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {formatCurrency(slice.outstanding)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                目前还没有未结清的欠款，录入借出后这里会自动展示每个人的占比。
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
