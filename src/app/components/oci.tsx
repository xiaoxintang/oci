'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { Instance } from 'oci-core/lib/model';
import { toLocalString } from '@/lib/time';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export interface ListItemI extends Instance {
  privateIp?: string;
  publicIp?: string;
}

export default function Oci(props: { list: ListItemI[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle>实例列表</CardTitle>
          <CardDescription>
            使用 shadcn 表格展示当前租户下的 OCI 计算实例。
          </CardDescription>
        </div>
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => startTransition(() => router.refresh())}
        >
          <RefreshCw className={isPending ? 'size-4 animate-spin' : 'size-4'} />
          刷新
        </Button>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>公共 IP</TableHead>
              <TableHead>专用 IP</TableHead>
              <TableHead>配置</TableHead>
              <TableHead>OCPU 计数</TableHead>
              <TableHead>内存 (GB)</TableHead>
              <TableHead>可用性域</TableHead>
              <TableHead>容错域</TableHead>
              <TableHead>创建时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.list.length ? (
              props.list.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.displayName || '--'}
                  </TableCell>
                  <TableCell>{item.lifecycleState || '--'}</TableCell>
                  <TableCell>{item.publicIp || '--'}</TableCell>
                  <TableCell>{item.privateIp || '--'}</TableCell>
                  <TableCell>{item.shape || '--'}</TableCell>
                  <TableCell>{item.shapeConfig?.ocpus ?? '--'}</TableCell>
                  <TableCell>{item.shapeConfig?.memoryInGBs ?? '--'}</TableCell>
                  <TableCell>{item.availabilityDomain || '--'}</TableCell>
                  <TableCell>{item.faultDomain || '--'}</TableCell>
                  <TableCell>{toLocalString(item.timeCreated)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  当前没有可展示的 OCI 实例。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
