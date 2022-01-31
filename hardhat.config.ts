import "dotenv/config"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-etherscan"

import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'

import { HardhatUserConfig } from "hardhat/config"

if (!process.env.PRIVATE_KEY) {
  console.log("WARNING: Private key was not read from .env file")
}
if (!process.env.SNOWTRACE_KEY) {
  console.log("WARNING: Snowtrace API key was not read from .env file")
}

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      accounts: [
        {
          privateKey: process.env.PRIVATE_KEY || "",
          balance: "100000000000000000000000",
        },
      ],
      chainId: 43114,
      forking: {
        //url: "https://node.snowapi.net/ext/bc/C/rpc",
        url: "https://api.avax.network/ext/bc/C/rpc",
      },
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [process.env.PRIVATE_KEY || ""],
    },
    mainnet: {
      chainId: 43114,
      url: "https://api.avax.network/ext/bc/C/rpc",
      accounts: [process.env.PRIVATE_KEY || ""],
    },
  },
  etherscan: {
    apiKey: process.env.SNOWTRACE_KEY,
  },
  mocha: {
    timeout: 240000,
  },
  typechain: {
    outDir: "types",
    target: "ethers-v5"
  }
  
}

export default config
