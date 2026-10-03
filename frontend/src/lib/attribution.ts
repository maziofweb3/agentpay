import { stringToHex, concatHex } from "viem";

export const ERC8021_MAGIC_TAG = "0x8021" as const;
export const DEFAULT_PROJECT_TAG = "agentpay-ai";

export function appendAttributionTag(
  calldata: `0x${string}` = "0x",
  projectTag: string = DEFAULT_PROJECT_TAG
): `0x${string}` {
  const tagHex = stringToHex(projectTag);
  return concatHex([calldata, tagHex, ERC8021_MAGIC_TAG]);
}
