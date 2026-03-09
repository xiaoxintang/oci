"use client";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import dayjs from "dayjs";
import { Instance } from "oci-core/lib/model";
export interface ListItemI extends Instance {
  privateIp?: string;
  publicIp?: string;
}

export default function Oci(props: { list: ListItemI[] }) {
  return (
    <div>
      <Button>刷新</Button>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>公共IP</TableHead>
            <TableHead>专用IP</TableHead>
            <TableHead>配置</TableHead>
            <TableHead>OCPU 计数</TableHead>
            <TableHead>内存 (GB)</TableHead>
            <TableHead>可用性域</TableHead>
            <TableHead>容错域</TableHead>
            <TableHead>创建时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.list.map((el) => {
            return (
              <TableRow key={el.id}>
                <TableCell>{el.displayName}</TableCell>
                <TableCell>{el.lifecycleState}</TableCell>
                <TableCell>{el.publicIp}</TableCell>
                <TableCell>{el.privateIp}</TableCell>
                <TableCell>{el.shape}</TableCell>
                <TableCell>{el.shapeConfig?.ocpus}</TableCell>
                <TableCell>{el.shapeConfig?.memoryInGBs}</TableCell>
                <TableCell>{el.availabilityDomain}</TableCell>
                <TableCell>{el.faultDomain}</TableCell>
                <TableCell>
                  {dayjs(el.timeCreated).format("YYYY-MM-DD HH:mm:ss")}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
