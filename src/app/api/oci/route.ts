import { ComputeClient, VirtualNetworkClient } from "oci-core";
import { Region, SimpleAuthenticationDetailsProvider } from "oci-common";
import { IdentityClient } from "oci-identity";
import { LaunchInstanceDetails } from "oci-core/lib/model";
import { sendDingTalkTextMessage } from "@/lib/dingtalk";

const shape = "VM.Standard.A1.Flex";
const successMsg = "抢到了";
export async function GET() {
  try {
    const authenticationDetailsProvider =
      new SimpleAuthenticationDetailsProvider(
        process.env.tenancy!,
        process.env.user!,
        process.env.fingerprint!,
        process.env.privateKey!,
        null,
        Region.fromRegionId(process.env.region!),
      );
    const compartmentId = authenticationDetailsProvider.getTenantId();
    const computerClient = new ComputeClient({
      authenticationDetailsProvider,
    });
    const response = await computerClient.listInstances({
      compartmentId: authenticationDetailsProvider.getTenantId(),
    });
    if (response.items.some((el) => el.shape === shape)) {
      /**
       * 这里说明已经抢到arm了，不需要再抢了，
       * todo 更换为使用kv来进行保存是否抢到
       * */
      return new Response(JSON.stringify({ message: "已经抢到了" }));
    }
    const identityClient = new IdentityClient({
      authenticationDetailsProvider,
    });
    const AvailabilityDomains = await identityClient.listAvailabilityDomains({
      compartmentId,
    });
    const images = await computerClient.listImages({
      compartmentId,
      shape,
      /**
       * 操作系统
       * - Canonical Ubuntu
       * - Oracle Linux
       * - RHEL
       */
      operatingSystem: "Canonical Ubuntu",
      operatingSystemVersion: "24.04",
    });
    const virtualNetworkClient = new VirtualNetworkClient({
      authenticationDetailsProvider,
    });
    const subnets = await virtualNetworkClient.listSubnets({
      compartmentId,
    });
    let message = successMsg;
    for (const availabilityDomain of AvailabilityDomains.items) {
      try {
        console.log("run availabilityDomain==>", availabilityDomain.name);
        const launchInstanceDetails: LaunchInstanceDetails = {
          compartmentId,
          availabilityDomain: availabilityDomain.name || "",
          shape: "VM.Standard.A1.Flex",
          shapeConfig: {
            ocpus: 1,
            memoryInGBs: 6,
          },
          displayName: `arm-${new Date().getTime()}`,
          sourceDetails: {
            imageId: images.items[0].id || "",
            sourceType: "image",
          },
          createVnicDetails: {
            subnetId: subnets.items[0].id || "",
          },
          metadata: {
            ssh_authorized_keys: process.env.ssh_authorized_keys!,
          },
        };
        // console.log(JSON.stringify(launchInstanceDetails));
        const res = await computerClient.launchInstance({
          launchInstanceDetails,
        });
        if (res) {
          break;
        }
      } catch (e) {
        message = (e as Error).message;
      }
    }
    if (
      process.env.DINGTALK_ACCESS_TOKEN &&
      process.env.DINGTALK_SECRET &&
      message === successMsg
    ) {
      await sendDingTalkTextMessage({
        content: successMsg,
        atMobiles: process.env.DINGTALK_AT_MOBILE
          ? process.env.DINGTALK_AT_MOBILE.split(",")
          : [],
      });
    }
    return Response.json({ message });
  } catch (err) {
    console.log("err", err);
  }
}
