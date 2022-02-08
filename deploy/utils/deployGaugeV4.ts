import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

export async function deployGaugeV4(hre: HardhatRuntimeEnvironment, deployment_name: string, tokens: string[], rates: string[]) {
    let contract_name = "GaugeV4";
    const {deployments, getNamedAccounts} = hre;
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    const governance_address = (await deployments.get("Governance")).address;
    await deploy(deployment_name, {
        from: deployer,
        args: [tokens, rates, governance_address],
        contract: contract_name,
        log: true
    });
}
