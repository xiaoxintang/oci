"use client";

import { Instance } from "oci-core/lib/model";
import {Button, Table} from "antd";
import {toLocalString} from "@/lib/time";
export interface ListItemI extends Instance {
  privateIp?: string;
  publicIp?: string;
}

export default function Oci(props: { list: ListItemI[] }) {
  return (
    <div>
      <Button>刷新</Button>
      <Table
          dataSource={props.list}
          columns={[
          {title:'名称',dataIndex:['displayName']},
          {title:'状态',dataIndex:['lifecycleState']},
          {title:'公共IP',dataIndex:['publicIp']},
          {title:'专用IP',dataIndex:['privateIp']},
          {title:'配置',dataIndex:['shape']},
          {title:'OCPU 计数',dataIndex:['shapeConfig','ocpus']},
          {title:'内存 (GB)',dataIndex:['shapeConfig','memoryInGBs']},
          {title:'可用性域',dataIndex:['availabilityDomain']},
          {title:'容错域',dataIndex:['faultDomain']},
          {title:'创建时间',dataIndex:['timeCreated'],render:(v)=>toLocalString(v)},
        ]}
      />
    </div>
  );
}
