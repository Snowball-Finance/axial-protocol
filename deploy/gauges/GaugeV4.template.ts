import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { CHAIN_ID } from "../../utils/network"
import { deployGaugeV4 } from "../utils/deployGaugeV4"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {

  const deployment_name = "GaugeV4Example";

  const rewardTokens = [
    "0xcF8419A615c57511807236751c0AF38Db4ba3351",
  ]

  const rewardRates = [
    "10000",
  ]

  await deployGaugeV4(
    hre,
    deployment_name,
    rewardTokens,
    rewardRates
  );
}

func.tags = ["gauges", "ex-gauge"]
export default func
