'use client';
import { Divider, Table } from 'antd';
import { toLocalString } from '@/lib/time';
import CreateCar from '@/app/car/components/create';
import { Database } from '@/types/database.types';
import DeleteCar from './delete';
interface CarListProps {
  dataSource: Database['public']['Tables']['car']['Insert'][];
}
export default function CarList({ dataSource }: CarListProps) {
  return (
    <Table
      dataSource={dataSource!}
      rowKey={(r) => r.id!}
      columns={[
        { title: '名字', dataIndex: ['name'] },
        { title: '购买时间', dataIndex: ['buy_at'], render: toLocalString },
        { title: '创建时间', dataIndex: ['created_at'], render: toLocalString },
        { title: '更新时间', dataIndex: ['updated_at'], render: toLocalString },
        {
          title: '操作',
          dataIndex: ['id'],
          render: (_, record) => (
            <>
              <DeleteCar id={record.id!} />
              <Divider type="vertical" />
              <CreateCar defaultValue={record} />
            </>
          ),
        },
      ]}
    />
  );
}
