'use client';
import { toLocalString } from '@/lib/time';
import CreateCar from '@/app/car/components/create';
import { Database } from '@/types/database.types';
import DeleteCar from './delete';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';

type CarRow = Pick<
  Database['public']['Tables']['car']['Row'],
  'id' | 'name' | 'buy_at' | 'created_at' | 'updated_at'
>;

interface CarListProps {
  dataSource: CarRow[];
}
export default function CarList({ dataSource }: CarListProps) {
  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名字</TableHead>
            <TableHead>购买时间</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead>更新时间</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataSource.length ? (
            dataSource.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">
                  {record.name || '--'}
                </TableCell>
                <TableCell>{toLocalString(record.buy_at)}</TableCell>
                <TableCell>{toLocalString(record.created_at)}</TableCell>
                <TableCell>{toLocalString(record.updated_at)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <CreateCar defaultValue={record} />
                    <DeleteCar id={record.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                暂时还没有车辆记录。
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
