"use client";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Button } from "@heroui/button";
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
          <TableColumn>名称</TableColumn>
          <TableColumn>状态</TableColumn>
          <TableColumn>公共IP</TableColumn>
          <TableColumn>专用IP</TableColumn>
          <TableColumn>配置</TableColumn>
          <TableColumn>OCPU 计数</TableColumn>
          <TableColumn>内存 (GB)</TableColumn>
          <TableColumn>可用性域</TableColumn>
          <TableColumn>容错域</TableColumn>
          <TableColumn>创建时间</TableColumn>
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
