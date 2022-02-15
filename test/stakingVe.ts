import { solidity } from "ethereum-waffle"

import {
  AxialTokenMock,
  AxialTokenMock__factory,
  StakingVe,
  StakingVe__factory,
} from "../build/typechain"
import chai from "chai"
import chaiAlmost from "chai-almost"
import { ethers } from "hardhat"
import { Signer } from "ethers"
//import { BigNumber } from 'ethers';
import { increaseTimestamp } from "./utils/evm"
import { ONE_WEEK } from "./utils/constants"

chai.use(chaiAlmost(0.01))
chai.use(solidity)
const { expect } = chai

/*********
 *
 * Test scenarios:
    A user should be able to lock tokens (they provide a period of time, up to max, and an amount)
    A user should be able to receive their unlocked tokens as the unlock vests
    A user should be able to increase the number of tokens they've locked
        The increase should not affect the prior amount of staked tokens they had in their history
    A user should be able to increase the time their tokens are locked for (up to the max lock period) The increase should not affect the prior amount of staked tokens they had in their history.  *
 */

describe("StakingVe", () => {
  let deployer: Signer
  let governance: Signer
  let alice: Signer
  let bob: Signer
  let carol: Signer

  let axialTokenMock: AxialTokenMock
  let stakingVe: StakingVe

  // 60s/min, 60m/hr, 24hr/day, 7day/wk, 52wk/yr
  const SECONDS_IN_A_YEAR = 60 * 60 * 24 * 7 * 52
  const SECONDS_IN_A_WEEK = 60 * 60 * 24 * 7
  const SECONDS_IN_A_DAY = 60 * 60 * 24
  const SECONDS_IN_AN_HOUR = 60 * 60

  // Deploy StakingVe once!
  beforeEach(async () => {
    ;[deployer, governance, alice, bob, carol] = await ethers.getSigners()

    axialTokenMock = await new AxialTokenMock__factory(deployer).deploy()

    await axialTokenMock
      .connect(deployer)
      .mints(
        [
          await deployer.getAddress(),
          await alice.getAddress(),
          await bob.getAddress(),
          await carol.getAddress(),
        ],
        [1000, 10, 100, 500],
      )

    stakingVe = await new StakingVe__factory(deployer).deploy(
      axialTokenMock.address,
      "sAxial",
      "SAXIAL",
      await governance.getAddress(),
    )
  })

  // Test cases:

  it("User cannot lock for more than two years (104 weeks)", async () => {
    await axialTokenMock.connect(alice).approve(stakingVe.address, "10")
    await expect(
      stakingVe.connect(alice).CreateLock(SECONDS_IN_A_YEAR * 2 + 1, "10"),
    ).to.be.revertedWith(">2 years")
  })

  it("User cannot create lock with more tokens then they have", async () => {
    await axialTokenMock.connect(alice).approve(stakingVe.address, "11")
    await expect(
      stakingVe.connect(alice).CreateLock("1000", "11"),
    ).to.be.revertedWith("!balance")
  })

  it("Locking 10 tokens for 2 years results in 10 governance tokens immediately and locked balance of 10", async () => {
    await axialTokenMock.connect(alice).approve(stakingVe.address, "10")
    await stakingVe.connect(alice).CreateLock(SECONDS_IN_A_YEAR * 2, "10")

    expect(await stakingVe.connect(alice).GetMyBalance()).to.eq(10)
    expect(await stakingVe.connect(alice).GetMyPower()).to.eq(10)
  })

  it("10 tokens locked for two years decays to 5 tokens locked and 5 governance tokens in one year", async () => {
    await axialTokenMock.connect(alice).approve(stakingVe.address, "10")
    await stakingVe.connect(alice).CreateLock(SECONDS_IN_A_YEAR * 2, "10")
    await increaseTimestamp(SECONDS_IN_A_YEAR)

    expect(await stakingVe.connect(alice).GetMyBalance()).to.eq(5)
    expect(await stakingVe.connect(alice).GetMyBalance()).to.almost(5)
  })

  it("10 tokens locked for two years decays to 0 tokens locked and 0 governance tokens in two years", async () => {
    await axialTokenMock.connect(alice).approve(stakingVe.address, "10")
    await stakingVe.connect(alice).CreateLock(SECONDS_IN_A_YEAR * 2, "10")
    await increaseTimestamp(SECONDS_IN_A_YEAR * 2)

    expect(await stakingVe.connect(alice).GetMyBalance()).to.eq(0)
    expect(await stakingVe.connect(alice).GetMyBalance()).to.almost(0)
  })

  it("user can create a lock", async () => {
    const lock_duration = ONE_WEEK
    await axialTokenMock.connect(alice).approve(stakingVe.address, "10")
    await stakingVe.connect(alice).CreateLock(lock_duration, "10")
    const locks = await stakingVe.connect(alice).GetMyLocks()
    expect(locks.length).to.eq(1)
    const lock = locks[0]
    expect(lock.StartingAmountLocked).to.eq(10)
    expect(lock.EndBlockTime.sub(lock.StartBlockTime)).to.eq(lock_duration)
    expect(await axialTokenMock.balanceOf(await alice.getAddress())).to.eq(0)
    expect(await axialTokenMock.balanceOf(stakingVe.address)).to.eq(10)
  })

  it("user can create multiple locks", async () => {
    await axialTokenMock.connect(alice).approve(stakingVe.address, "10")
    await stakingVe.connect(alice).CreateLock(SECONDS_IN_A_YEAR, "2")
    await increaseTimestamp(100)
    await stakingVe.connect(alice).CreateLock(SECONDS_IN_A_YEAR, "2")
    await increaseTimestamp(100)
    await stakingVe.connect(alice).CreateLock(SECONDS_IN_A_YEAR, "2")

    const locks = await stakingVe.connect(alice).GetMyLocks()
    expect(locks.length).to.eq(3)
  })

  it("Three users who create locks for a year should have half of the locked quantity in voting power, rounded down to the nearest whole number", async () => {
    await axialTokenMock.connect(alice).approve(stakingVe.address, "10")
    await axialTokenMock.connect(bob).approve(stakingVe.address, "100")
    await axialTokenMock.connect(carol).approve(stakingVe.address, "500")

    await stakingVe.connect(alice).CreateLock(SECONDS_IN_A_YEAR, "10")
    await stakingVe.connect(bob).CreateLock(SECONDS_IN_A_YEAR, "100")
    await stakingVe.connect(carol).CreateLock(SECONDS_IN_A_YEAR, "500")

    const alice_locks = await stakingVe.connect(alice).GetMyLocks()
    const bob_locks = await stakingVe.connect(bob).GetMyLocks()
    const carol_locks = await stakingVe.connect(carol).GetMyLocks()

    expect(alice_locks.length).to.eq(1)
    expect(bob_locks.length).to.eq(1)
    expect(carol_locks.length).to.eq(1)

    const alice_lock = alice_locks[0]
    const bob_lock = bob_locks[0]
    const carol_lock = carol_locks[0]

    expect(alice_lock.StartingAmountLocked).to.eq(10)
    expect(alice_lock.EndBlockTime.sub(alice_lock.StartBlockTime)).to.eq(
      SECONDS_IN_A_YEAR,
    )
    expect(bob_lock.StartingAmountLocked).to.eq(100)
    expect(bob_lock.EndBlockTime.sub(bob_lock.StartBlockTime)).to.eq(
      SECONDS_IN_A_YEAR,
    )
    expect(carol_lock.StartingAmountLocked).to.eq(500)
    expect(carol_lock.EndBlockTime.sub(carol_lock.StartBlockTime)).to.eq(
      SECONDS_IN_A_YEAR,
    )

    expect(await stakingVe.connect(alice).GetMyPower()).to.eq(4)
    expect(await stakingVe.connect(bob).GetMyPower()).to.almost(49)
    expect(await stakingVe.connect(carol).GetMyPower()).to.almost(250)
  })

  it("Balance, Power linearly decay over time and can be claimed repeatedly", async () => {
    // Give alice a holiday bonus
    await axialTokenMock
      .connect(deployer)
      .mints([await alice.getAddress()], [90])

    await axialTokenMock.connect(alice).approve(stakingVe.address, "100")
    await stakingVe.connect(alice).CreateLock(SECONDS_IN_A_YEAR * 2, "100")

    let balance = await stakingVe.connect(alice).GetMyBalance()
    let power = await stakingVe.connect(alice).GetMyPower()
    let inWallet = await axialTokenMock.balanceOf(await alice.getAddress())
    console.log(
      "Day %d, Balance: %d Power: %d, Wallet: %d",
      0,
      balance,
      power,
      inWallet,
    )

    for (let i = 1; i < 104; ++i) {
      await increaseTimestamp(SECONDS_IN_A_WEEK)
      balance = await stakingVe.connect(alice).GetMyBalance()
      power = await stakingVe.connect(alice).GetMyPower()
      await stakingVe.connect(alice).ClaimMyFunds()
      inWallet = await axialTokenMock.balanceOf(await alice.getAddress())
      console.log(
        "Week: %d, Balance: %d Power: %d, Wallet: %d",
        i,
        balance,
        power,
        inWallet,
      )
      expect(balance.add(inWallet)).to.eq(100)
      expect(balance).to.eq(power)
    }
  })

  it("claiming repeatedly does not affect a different users funds, or allow user to claim more than they are owed", async () => {
    await axialTokenMock.connect(alice).approve(stakingVe.address, "10")
    await axialTokenMock.connect(bob).approve(stakingVe.address, "100")

    await stakingVe.connect(alice).CreateLock(SECONDS_IN_A_YEAR * 2, "10")
    await stakingVe.connect(bob).CreateLock(SECONDS_IN_A_YEAR * 2, "100")

    await increaseTimestamp(SECONDS_IN_A_YEAR)

    const balance = await stakingVe.GetBalance(await alice.getAddress())

    await stakingVe.connect(alice).ClaimMyFunds()
    const inWallet = await axialTokenMock.balanceOf(await alice.getAddress())
    await stakingVe.connect(alice).ClaimMyFunds()
    const inWalletAfterClaimingTwice = await axialTokenMock.balanceOf(
      await alice.getAddress(),
    )
    await stakingVe.connect(bob).ClaimMyFunds()
    const inBobsWallet = await axialTokenMock.balanceOf(await bob.getAddress())

    expect(inWallet).to.eq(inWalletAfterClaimingTwice)
    expect(inBobsWallet).to.eq(51)
  })

  // it("User can increase the duration of a pre-existing lock, up to the max duration of two years", async () => {
  //   await axialTokenMock.connect(alice).approve(stakingVe.address, '10');
  //   await stakingVe.connect(alice).CreateLock(SECONDS_IN_A_YEAR, '10');
  //   await stakingVe.connect(alice).ExtendMyLock(0, SECONDS_IN_A_YEAR);
  //   await expect(stakingVe.connect(alice).ExtendMyLock(0, 1)).to.be.revertedWith('>2 years');
  // });

  // it.only("Balance, Power linearly decay over time and can be claimed repeatedly with lock time increasing", async () => {

  //   // Give alice a holiday bonus
  //   await axialTokenMock.connect(deployer).mints([await alice.getAddress()], [90]);

  //   await axialTokenMock.connect(alice).approve(stakingVe.address, '100');
  //   await stakingVe.connect(alice).CreateLock(SECONDS_IN_A_YEAR, '100');

  //   let balance = await stakingVe.connect(alice).GetMyBalance();
  //   let power = await stakingVe.connect(alice).GetMyPower();
  //   let inWallet = await axialTokenMock.balanceOf(await alice.getAddress());
  //   console.log("Day %d, Balance: %d Power: %d, Wallet: %d", 0, balance, power, inWallet);

  //   for (let i = 1; i < 34 + 52; ++i) {
  //     await (increaseTimestamp(SECONDS_IN_A_WEEK));
  //     // In 34 weeks, extend our lock by another year
  //     if (i == 34) {
  //       console.log("Extending lock by one year");
  //       await stakingVe.connect(alice).ExtendMyLock(0, SECONDS_IN_A_YEAR);
  //     }
  //     balance = await stakingVe.connect(alice).GetMyBalance();
  //     power = await stakingVe.connect(alice).GetMyPower();
  //     console.log("Claiming Funds, balance says:", balance.toString());
  //     await stakingVe.connect(alice).ClaimMyFunds();
  //     inWallet = await axialTokenMock.balanceOf(await alice.getAddress());
  //     console.log("Week: %d, Balance: %d Power: %d, Wallet: %d", i, balance, power, inWallet);
  //     //expect(balance.add(inWallet)).to.eq(100);
  //     //expect(balance).to.eq(power);
  //   }
  // });

  // it("User can create a large quantity of locks", async () => {
  //   // Alice's holiday bonus
  //   await axialTokenMock
  //     .connect(deployer)
  //     .mints([await alice.getAddress()], [99999999])
  //   await axialTokenMock.connect(alice).approve(stakingVe.address, "99999999")

  //   for (let i = 0; i < 1000; ++i) {
  //     await stakingVe
  //       .connect(alice)
  //       .CreateLock(SECONDS_IN_A_YEAR * 2, (10 + i).toString())
  //     await increaseTimestamp(SECONDS_IN_A_WEEK)
  //     await stakingVe.connect(alice).ClaimMyFunds()

  //     const balance = await stakingVe.connect(alice).GetMyBalance()
  //     const power = await stakingVe.connect(alice).GetMyPower()
  //     const inWallet = await axialTokenMock.balanceOf(await alice.getAddress())
  //     console.log(
  //       "Week %d, Balance: %d Power: %d, Wallet: %d",
  //       i,
  //       balance,
  //       power,
  //       inWallet,
  //     )
  //   }
  // })

  // it("User can create a new lock every day with their rewards", async () => {
  //   // Alice's holiday bonus
  //   await axialTokenMock
  //     .connect(deployer)
  //     .mints([await alice.getAddress()], [90])

  //   for (let i = 0; i < 1000; ++i) {
  //     let inWallet = await axialTokenMock.balanceOf(await alice.getAddress())
  //     await axialTokenMock.connect(alice).approve(stakingVe.address, inWallet)
  //     await stakingVe.connect(alice).CreateLock(SECONDS_IN_A_YEAR * 2, inWallet)
  //     await stakingVe.connect(alice).ClaimMyFunds()
  //     await increaseTimestamp(SECONDS_IN_A_DAY)

  //     const balance = await stakingVe.connect(alice).GetMyBalance()
  //     const power = await stakingVe.connect(alice).GetMyPower()
  //     inWallet = await axialTokenMock.balanceOf(await alice.getAddress())
  //     console.log(
  //       "Day %d, Balance: %d Power: %d, Wallet: %d",
  //       i,
  //       balance,
  //       power,
  //       inWallet,
  //     )
  //   }
  // })

  //it("user should be able to increase their lock duration", async () => { });
  //it("user should not be able to decrease their lock duration", async () => { });

  /*
  it("locks remove on withdraws", async () => {});

  describe("::GetMyBalance", () => {
    it("Returns total amount of tokens across all locks", async () => {});
    it("expired lock", async () => {});
    it("single", async () => {});
      it("parital decay", async () => {});
      it("full decay", async () => {});

    it("multiple locks", async () => {});
      it("offsetting time locks", async () => {});
  })

  // relies on GetMyBalance
  describe("::ClaimMyFunds", () => {
    // sAxial --> Axial
    it("claim all tokens availble from GetMyBalance", async () => {});
  })
  */
})
