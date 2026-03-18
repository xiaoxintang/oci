'use client';
import { Button, Popconfirm } from 'antd';
import { deleteCar } from '../actions';

export default function DeleteCar(props: { id: string }) {
  return (
    <Popconfirm
      title="确定要删除吗？"
      onConfirm={() => {
        deleteCar(props.id);
      }}
    >
      <Button danger>删除</Button>
    </Popconfirm>
  );
}
