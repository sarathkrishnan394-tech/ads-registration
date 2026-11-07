import { headers } from "next/headers";
import { getIdentity } from "../../cursor/identity";

export async function viewer() {
  const identity = await getIdentity(await headers());
  if (!identity.verified) {
    return { name: "ADS Team", email: "", simulated: true as const };
  }
  return {
    name: identity.name || "ADS Team",
    email: identity.email,
    simulated: Boolean(identity.simulated),
  };
}
