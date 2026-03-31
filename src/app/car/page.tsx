import { createServerSupabase } from '@/lib/supabase/server';
import CarList from '@/app/car/components/list';
import CreateCar from './components/create';

export default async function Car() {
  const supabase = await createServerSupabase();
  const cars = await supabase
    .from('car')
    .select('id, name,created_at,updated_at,buy_at');

  return (
    <div className="space-y-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">车辆管理</h1>
          <p className="text-sm text-muted-foreground">
            现在这一页的交互已经全部切换到 shadcn 组件。
          </p>
        </div>
        <CreateCar defaultValue={undefined} actionText="创建" />
      </div>
      <CarList dataSource={cars.data!} />
    </div>
  );
}
