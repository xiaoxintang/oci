import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SetupNotice() {
  return (
    <div className="py-6">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>车辆管理数据库还未初始化</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            当前运行时报错的原因是 Supabase 里还没有创建车辆管理模块需要的表和视图。
          </p>
          <p>
            请先执行仓库里的 migration：
            `supabase/migrations/20260401103000_create_car_management.sql`
          </p>
          <p>
            执行完成后，刷新 `/car` 页面即可正常使用。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
