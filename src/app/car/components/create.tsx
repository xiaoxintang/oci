'use client';
import { Button, Form, Input, Modal, DatePicker } from 'antd';
import { Database } from '@/types/database.types';

import { createCar, updateCar } from '@/app/car/actions';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
type CarInsert = Database['public']['Tables']['car']['Insert'];
import FormItem from 'antd/es/form/FormItem';

export default function CreateCar(props: {
  defaultValue: CarInsert | undefined;
  actionText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<CarInsert>();
  const onSubmit = async () => {
    form.validateFields().then(async (values) => {
      // "use server"
      console.log('values==>', values);
      // const supabase = await createServerSpabase();
      // await supabase.from('car').update({name:values.name}).eq('id',values.id)
      // revalidatePath('/car','page')
      try {
        if (values.id) {
          await updateCar(values);
        } else {
          await createCar(values);
        }
      } catch (error) {
        console.error('update car error==>', error);
      }
      setOpen(false);
    });
  };
  useEffect(() => {
    if (open) {
      console.log('dayjs.locale()==>', dayjs.locale());
      form.resetFields();
    }
  }, [open, form]);
  return (
    <>
      <Button
        type="primary"
        onClick={() => {
          setOpen(true);
        }}
      >
        {props.actionText || '编辑'}
      </Button>
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        title="车辆编辑"
        onOk={() => onSubmit()}
      >
        <Form form={form} initialValues={props.defaultValue}>
          <FormItem name="id" hidden>
            <Input />
          </FormItem>
          <FormItem name="name" label="品牌型号">
            <Input />
          </FormItem>
          <FormItem label="购买时间">
            <FormItem name="buy_at" hidden>
              <Input />
            </FormItem>
            <FormItem
              shouldUpdate={(pre, cur) => pre.buy_at !== cur.buy_at}
              noStyle
            >
              {() => {
                const buyAt = form.getFieldValue('buy_at');
                return (
                  <DatePicker
                    value={buyAt ? dayjs(buyAt) : undefined}
                    onChange={(date) => {
                      form.setFieldValue('buy_at', date?.toISOString());
                    }}
                  />
                );
              }}
            </FormItem>
          </FormItem>
        </Form>
      </Modal>
    </>
  );
}
