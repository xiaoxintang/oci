'use client';

import { useState } from 'react';
import { HandCoins } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { toNumberValue } from '@/lib/time';

import Dashboard from './dashboard';
import RecentLedgerTable from './recent-ledger-table';
import RecordEntryDialog from './record-entry-dialog';
import SummaryTable from './summary-table';
import {
  type CounterpartyOption,
  type DebtSummaryRow,
  type LedgerEntryRow,
  type LedgerEntryType,
  type SummaryFilter,
} from '../types';

type FundsPageClientProps = {
  counterparties: CounterpartyOption[];
  ledgerRows: LedgerEntryRow[];
  summaryRows: DebtSummaryRow[];
};

type DialogState = {
  open: boolean;
  entryType: LedgerEntryType;
  counterpartyId?: string;
};

export default function FundsPageClient({
  counterparties,
  ledgerRows,
  summaryRows,
}: FundsPageClientProps) {
  const [statusFilter, setStatusFilter] = useState<SummaryFilter>('open');
  const [activeCounterpartyId, setActiveCounterpartyId] = useState<string | null>(
    null,
  );
  const [dialogState, setDialogState] = useState<DialogState>({
    open: false,
    entryType: 'loan',
  });
  const dialogKey = `${dialogState.entryType}:${dialogState.counterpartyId ?? 'new'}:${dialogState.open ? 'open' : 'closed'}`;

  const filteredSummaryRows = summaryRows.filter((row) => {
    const outstandingAmount = toNumberValue(row.outstanding_amount);

    if (statusFilter === 'open') {
      return outstandingAmount > 0;
    }

    if (statusFilter === 'settled') {
      return outstandingAmount <= 0;
    }

    return true;
  });

  const activeCounterpartyName =
    summaryRows.find((row) => row.counterparty_id === activeCounterpartyId)
      ?.counterparty_name ??
    counterparties.find((row) => row.id === activeCounterpartyId)?.name ??
    null;

  const filteredLedgerRows = activeCounterpartyId
    ? ledgerRows.filter((row) => row.counterparty_id === activeCounterpartyId)
    : ledgerRows;

  const openDialog = (
    entryType: LedgerEntryType,
    options?: {
      counterpartyId?: string;
    },
  ) => {
    setDialogState({
      open: true,
      entryType,
      counterpartyId: options?.counterpartyId,
    });
  };

  return (
    <div className="space-y-6 py-6">
      <section className="flex flex-col gap-4 rounded-3xl border bg-card px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">资金账单</p>
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight">借出与回款</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                记录别人向你借钱和还钱的流水，系统会自动计算每个人当前还欠多少。
              </p>
            </div>
          </div>
          <Button onClick={() => openDialog('loan')}>
            <HandCoins className="size-4" />
            录入账单
          </Button>
        </div>
      </section>

      <Dashboard summaryRows={summaryRows} />

      <SummaryTable
        activeCounterpartyId={activeCounterpartyId}
        rows={filteredSummaryRows}
        statusFilter={statusFilter}
        onInspectCounterparty={(counterpartyId) =>
          setActiveCounterpartyId((current) =>
            current === counterpartyId ? null : counterpartyId,
          )
        }
        onOpenRepayment={(counterpartyId) =>
          openDialog('repayment', {
            counterpartyId,
          })
        }
        onStatusFilterChange={setStatusFilter}
      />

      <RecentLedgerTable
        activeCounterpartyName={activeCounterpartyName}
        ledgerRows={filteredLedgerRows}
        onClearCounterparty={() => setActiveCounterpartyId(null)}
      />

      <RecordEntryDialog
        key={dialogKey}
        counterparties={counterparties}
        defaultCounterpartyId={dialogState.counterpartyId}
        defaultEntryType={dialogState.entryType}
        open={dialogState.open}
        summaryRows={summaryRows}
        onOpenChange={(open) =>
          setDialogState((current) => ({
            ...current,
            open,
          }))
        }
      />
    </div>
  );
}
