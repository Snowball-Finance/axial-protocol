export const CHAIN_ID = {
  MAINNET: "1",
  ROPSTEN: "3",
  KOVAN: "42",
  AVALANCHE: "43114",
  HARDHAT: "31337",
}

export function isMainnet(networkId: string): boolean {
  return networkId == CHAIN_ID.MAINNET
}

// TODO
//export function isAvalanche(networkId: string): boolean {
//  return networkId == CHAIN_ID.AVALANCHE
//}

export function isTestNetwork(networkId: string): boolean {
  return (
    networkId == CHAIN_ID.HARDHAT ||
    networkId == CHAIN_ID.ROPSTEN ||
    networkId == CHAIN_ID.KOVAN
  )
}
