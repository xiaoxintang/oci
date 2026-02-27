import { Region, SimpleAuthenticationDetailsProvider } from "oci-common";
import { ComputeClient, VirtualNetworkClient } from "oci-core";

import { Instance } from "oci-core/lib/model";
import Oci, { ListItemI } from "./components/oci";

export default async function Home() {
  const authenticationDetailsProvider = new SimpleAuthenticationDetailsProvider(
    process.env.tenancy!,
    process.env.user!,
    process.env.fingerprint!,
    process.env.privateKey!,
    null,
    Region.fromRegionId(process.env.region!),
  );
  const computerClient = new ComputeClient({
    authenticationDetailsProvider,
  });
  const virtualNetworkClient = new VirtualNetworkClient({
    authenticationDetailsProvider,
  });
  const response = await computerClient.listInstances({
    compartmentId: authenticationDetailsProvider.getTenantId(),
  });
  const list: ListItemI[] = [];
  for (const item of response.items) {
    const tmpItem: ListItemI = {
      ...item,
      privateIp: "",
      publicIp: "",
    };

    if (item.lifecycleState === Instance.LifecycleState.Running) {
      const res = await computerClient.listVnicAttachments({
        compartmentId: authenticationDetailsProvider.getTenantId(),
        instanceId: item.id,
      });
      const r = await virtualNetworkClient.getVnic({
        vnicId: res.items[0].vnicId as string,
      });
      tmpItem.privateIp = r.vnic?.privateIp as string;
      tmpItem.publicIp = r.vnic?.publicIp as string;
      // console.log("vnic attachments for instance", item.id, res);
      // console.log("vnic", JSON.stringify(r));
    }
    list.push(tmpItem);
  }
  // console.log(response);

  return (
    <div>
      OCI app
      <div>{authenticationDetailsProvider.getTenantId()}</div>
      <div>
        <Oci list={list} />
      </div>
    </div>
  );
}
