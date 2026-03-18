import { createServerSupabase } from '@/lib/supabase/server';
import CarList from '@/app/car/components/list';
import CreateCar from './components/create';

export default async function Car() {
  const supabase = await createServerSupabase();
  const cars = await supabase
    .from('car')
    .select('id, name,created_at,updated_at,buy_at');
  // await supabase.from('car').insert({
  //     name:'比亚迪驱逐舰05',
  //     buy_at:dayjs().toISOString(),
  // })
  return (
    <div>
      <CreateCar defaultValue={undefined} actionText="创建" />
      <CarList dataSource={cars.data!} />
    </div>
  );
}
