import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SetupNotice() {
  return (
    <div className="py-6">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>资金账单数据库还未初始化</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            当前运行时报错的原因是 Supabase 里还没有创建
            `counterparty`、`money_ledger` 和 `debt_balance_view`。
          </p>
          <p>
            请先执行仓库里的 migration：
            `supabase/migrations/20260331120000_create_funds_ledger.sql`
          </p>
          <p>
            执行完成后，刷新 `/funds` 页面即可正常使用。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
