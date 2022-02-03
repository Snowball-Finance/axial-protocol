/* eslint-disable no-undef */
import { Signer, Contract } from "ethers"
import { network } from "hardhat"
import { returnSigner } from "../../utils/helpers"
import {
  setupSigners,
  generateToken,
  generateLPToken,
} from "../../utils/static"
import {
  MultiRewarderContract,
  MasterChefAxialV3,
} from "../mocks/MultiRewarder"
import {
  addRewardToken,
  balanceOfRewardTokens,
  pendingRewardTokens,
  updatePoolInfo,
  updateRewardRate,
  addNewLP,
  depositsLPToMasterChef,
  pendingTokens,
  pendingMultiTokens
} from "../mocks/InternalFunctions"
import { log } from "../../utils/log"

const doMultiRewardsTest = () => {
  const wallet_addr =
    process.env.WALLET_ADDR === undefined ? "" : process.env["WALLET_ADDR"]

  let MultiRewarder: Contract
  let MasterChefAxial: Contract
  let LPAsset: Contract

  let masterchefAxial_addr = "0x958C0d0baA8F220846d3966742D4Fb5edc5493D3"

  let walletSigner: Signer
  let timelockSigner: Signer
  let governanceSigner: Signer
  let masterchefSigner: Signer

  let snapshotId: string
  let asset1: string, asset2: string, asset3: string, asset4: string
  let rewardTokensArray: string[]
  let tokensPerSec: string[]
  let lp: Contract
  let timelock_addr: string
  let governance_addr: string
  let multiRewarder_addr: string

  describe("Tests for multi-rewards:", async () => {
    before(async () => {
      await network.provider.send("hardhat_impersonateAccount", [wallet_addr])
      log(`\timpersonating account: ${wallet_addr}`)
      walletSigner = await returnSigner(wallet_addr)
      ;[timelockSigner, governanceSigner] = await setupSigners()

      timelock_addr = await timelockSigner.getAddress()
      governance_addr = await governanceSigner.getAddress()

      // Generate four new reward tokens
      asset1 = await generateToken("Asset1", "A1", wallet_addr, walletSigner)
      asset2 = await generateToken("Asset2", "A2", wallet_addr, walletSigner)
      asset3 = await generateToken("Asset3", "A3", wallet_addr, walletSigner)
      asset4 = await generateToken("Asset4", "A4", wallet_addr, walletSigner)

      // An array of reward tokens
      rewardTokensArray = [asset1, asset2, asset3, asset4]

      // Generate an LP token
      lp = await generateLPToken("LPToken", "LP", wallet_addr, walletSigner)

      // Create tokens per sec array
      tokensPerSec = [
        "250000000000",
        "250000000000",
        "250000000000",
        "250000000000",
      ]

      /** Connect to existing MasterChefAxial Contract */
      MasterChefAxial = await MasterChefAxialV3(
        masterchefAxial_addr,
        timelockSigner,
      )

      /** MultiRewarder Mock **/
      MultiRewarder = await MultiRewarderContract(
        lp.address,
        rewardTokensArray,
        tokensPerSec,
        masterchefAxial_addr,
        governance_addr,
      )
    })

    it("should add a reward token to our list of reward tokens", async function () {
      await addRewardToken(MultiRewarder, governanceSigner, "239042309532", masterchefAxial_addr, walletSigner)
    })

    it("should check the MultiRewarderSec's balance function is returning an array of balances", async function () {
      await balanceOfRewardTokens(MultiRewarder)
    })

    it("should add a new lp to MasterChefAxialV3 ", async function () {
      await addNewLP(MasterChefAxial, timelockSigner, lp.address, MultiRewarder)
    })

    it("should deposit an initial amount of the lp token into MCA", async function () {
      await depositsLPToMasterChef(lp, walletSigner, wallet_addr, masterchefAxial_addr, MasterChefAxial, timelockSigner)
    })

    it("should return the pending axial on frontend", async function () {
      await pendingMultiTokens(MasterChefAxial, MultiRewarder, timelockSigner, wallet_addr)
    })

    it("should return the number of tokens pending for each reward token", async function () {
      await pendingRewardTokens(MultiRewarder, wallet_addr)
    })

    it("should update pool in MultiRewarder Contract", async function () {
       await updatePoolInfo(MultiRewarder);
    })

    // it("should update the reward rate of a reward token", async function () {
    //    await updateRewardRate(MultiRewarder, asset1, tokensPerSec);
    //    expect(tokensPerSec[0]).to.be.equals("350000000000");
    // })
  })
}

doMultiRewardsTest()
