import { ComputeClient, VirtualNetworkClient } from "oci-core";
import { Region, SimpleAuthenticationDetailsProvider } from "oci-common";
import { IdentityClient } from "oci-identity";
import { LaunchInstanceDetails } from "oci-core/lib/model";

const shape = "VM.Standard.A1.Flex";
export async function GET(request: Request) {
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
    for (const availabilityDomain of AvailabilityDomains.items) {
      try {
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
        console.log(JSON.stringify(launchInstanceDetails));
        const res = await computerClient.launchInstance({
          launchInstanceDetails,
        });
        if (res) {
          break;
        }
      } catch (e) {
        console.warn((e as Error).message);
        return Response.json({ message: (e as Error).message });
      }
    }
    /**todo 发送通知 */
    return Response.json({ message: "抢到了" });
  } catch (err) {
    console.log("err", err);
  }
}

export async function HEAD(request: Request) {}

export async function POST(request: Request) {}

export async function PUT(request: Request) {}

export async function DELETE(request: Request) {}

export async function PATCH(request: Request) {}

// If `OPTIONS` is not defined, Next.js will automatically implement `OPTIONS` and set the appropriate Response `Allow` header depending on the other methods defined in the Route Handler.
export async function OPTIONS(request: Request) {}
