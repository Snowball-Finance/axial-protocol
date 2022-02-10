import { solidity } from "ethereum-waffle"
import { deployMockContract } from "@ethereum-waffle/mock-contract"
import { MockProvider } from "@ethereum-waffle/provider"

import { 
  AxialTokenMock, AxialTokenMock__factory,
  StakingVe, StakingVe__factory
} from "../build/typechain"
import chai from "chai"
import chaiAlmost from "chai-almost"
import { ethers } from "hardhat"
import { Signer, BigNumber } from "ethers"
//import { BigNumber } from 'ethers';
import { increaseTimestamp } from "./utils/evm";
import { bnToNumber } from "./utils/math";
import { ONE_WEEK } from "./utils/constants";

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

  /*
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;
  */
  let deployer: Signer;
  let governance: Signer;
  let alice: Signer;
  let bob: Signer;
  let carol: Signer;


  let axialTokenMock: AxialTokenMock;
  let stakingVe: StakingVe;

  const TWO_YEARS = 2*((3600*24)*365);


  async function setup() {
    [deployer, governance, alice, bob, carol] = await ethers.getSigners();

    axialTokenMock = await new AxialTokenMock__factory(deployer).deploy();
    await axialTokenMock.connect(deployer).mints(
      [await deployer.getAddress(), await alice.getAddress(), await bob.getAddress(), await carol.getAddress()], 
      [1000, 10, 100, 500]
    );

    stakingVe = await new StakingVe__factory(deployer).deploy(
      axialTokenMock.address,
      "sAxial",
      "SAXIAL",
      await governance.getAddress()

    );
//    return {deployer, axialTokenMock, alice, bob, charly};
  }

  beforeEach(async () => {
    await setup();
  });

  //describe("::CreateLock", () => {

    // define?
    it("max lock time", async () => {
      await axialTokenMock.connect(alice).approve(stakingVe.address, '10');
      await expect(
        stakingVe.connect(alice).CreateLock(TWO_YEARS+1, '10')
      ).to.be.revertedWith('>2 years');
    });
    
    /*
    it("min lock time", async () => {
      const ONE_DAY = (3600 * 24) - 1;  

      await expect(
        await stakingVe.connect(alice).CreateLock(0, 10)
      ).to.be.revertedWith('minimum lock duration not met'); 

      await expect(
        await stakingVe.connect(alice).CreateLock(ONE_DAY, 10)
      ).to.be.revertedWith('minimum lock duration not met'); 
    });
    */

    it("user can not create lock with 0 amount", async () => {
      await axialTokenMock.connect(alice).approve(stakingVe.address, '10');
      await expect(
        stakingVe.connect(alice).CreateLock('1000', '0')
      ).to.be.revertedWith("invalid lock amount");
    });

    it("user can not create lock with more tokens then they have", async () => {
      await axialTokenMock.connect(alice).approve(stakingVe.address, '11');
      await expect(
        stakingVe.connect(alice).CreateLock('1000', '11')
      ).to.be.revertedWith("SafeERC20: TransferFrom failed");
      //).to.be.revertedWith("!balance");
    });

    //it("lock decay immediate", async () => {}); // if allow 0 duration
    it("lock decay", async () => {
      await axialTokenMock.connect(alice).approve(stakingVe.address, '10');
      await stakingVe.connect(alice).CreateLock(TWO_YEARS, '10');

      expect(
        await stakingVe.connect(alice).GetMyBalance()
      ).to.eq(10);
      expect(
        await stakingVe.connect(alice).GetMyPower()
      ).to.eq(10);


      await increaseTimestamp(TWO_YEARS/2);

      expect(
        await stakingVe.connect(alice).GetMyBalance()
      ).to.eq(5);
      expect(
        await stakingVe.connect(alice).GetMyBalance()
      ).to.almost(5);

      await increaseTimestamp(TWO_YEARS/2);

      expect(
        await stakingVe.connect(alice).GetMyBalance()
      ).to.eq(0);
      expect(
        await stakingVe.connect(alice).GetMyBalance()
      ).to.almost(0);
    });

    /*
    it("lock decay fully", async () => {
      await axialTokenMock.connect(alice).approve(stakingVe.address, '10');
      await stakingVe.connect(alice).CreateLock('1000', '10');

      expect(
        await stakingVe.GetPower(await alice.getAddress())
      ).to.eq(10);

      await increaseTimestamp(1050);

      expect(
        await stakingVe.connect(alice).GetMyBalance()
      ).to.eq(0);
    });
    */

    // minimum amount
    it("user can not create lock with 0 duration", async () => {
      await axialTokenMock.connect(alice).approve(stakingVe.address, '10');
      expect(
        stakingVe.connect(alice).CreateLock('0', '10')
      ).to.be.revertedWith("duration must be nonzero");
    });

    it("user can create a lock", async () => {
      const lock_duration = ONE_WEEK;
      await axialTokenMock.connect(alice).approve(stakingVe.address, '10');
      await stakingVe.connect(alice).CreateLock(lock_duration, '10');
      const locks = await stakingVe.connect(alice).GetMyLocks();
      expect(locks.length).to.eq(1);
      const lock = locks[0];
      expect(lock.StartingAmountLocked).to.eq(10);
      expect(lock.EndBlockTime.sub(lock.StartBlockTime)).to.eq(lock_duration);
      expect(await axialTokenMock.balanceOf(await alice.getAddress())).to.eq(0);
      expect(await axialTokenMock.balanceOf(stakingVe.address)).to.eq(10);
    });

    it("user can create multiple locks", async () => {
      const base_duration = TWO_YEARS;
      await axialTokenMock.connect(alice).approve(stakingVe.address, '10');
      let total_locked = 0;
      for (let i=1; i < 4; i++) {
         total_locked += i;
         await stakingVe.connect(alice).CreateLock(base_duration, i);
         /*
         expect(
            await stakingVe.GetBalance(await alice.getAddress())
         ).to.almost(total_locked);
         */
      }
      const locks = await stakingVe.connect(alice).GetMyLocks();
      expect(locks.length).to.eq(3);
      for (let i=0; i < locks.length; i++) {
         let duration = base_duration;
         expect(locks[i].StartingAmountLocked).to.eq(i+1);
         expect(
            locks[i].EndBlockTime.sub(locks[i].StartBlockTime)
         ).to.almost(duration);
      }
    });

    it("multiple users can create a lock", async () => { 
       await axialTokenMock.connect(alice).approve(stakingVe.address, '10');
       await axialTokenMock.connect(bob).approve(stakingVe.address, '100');
       await axialTokenMock.connect(carol).approve(stakingVe.address, '500');

       const ONE_YEAR = TWO_YEARS / 2;
       await stakingVe.connect(alice).CreateLock(ONE_YEAR, '10');
       await stakingVe.connect(bob).CreateLock(ONE_YEAR, '100');
       await stakingVe.connect(carol).CreateLock(ONE_YEAR, '500');

       const alice_locks = await stakingVe.connect(alice).GetMyLocks();
       const bob_locks = await stakingVe.connect(bob).GetMyLocks();
       const carol_locks = await stakingVe.connect(carol).GetMyLocks();

       expect(alice_locks.length).to.eq(1);
       expect(bob_locks.length).to.eq(1);
       expect(carol_locks.length).to.eq(1);

       const alice_lock = alice_locks[0];
       const bob_lock = bob_locks[0];
       const carol_lock = carol_locks[0];

       expect(alice_lock.StartingAmountLocked).to.eq(10);
       expect(alice_lock.EndBlockTime.sub(alice_lock.StartBlockTime)).to.eq(ONE_YEAR);
       expect(bob_lock.StartingAmountLocked).to.eq(100);
       expect(bob_lock.EndBlockTime.sub(bob_lock.StartBlockTime)).to.eq(ONE_YEAR);
       expect(carol_lock.StartingAmountLocked).to.eq(500);
       expect(carol_lock.EndBlockTime.sub(carol_lock.StartBlockTime)).to.eq(ONE_YEAR);

       //expect(await stakingVe.connect(alice).GetMyBalance()).to.eq(5);
       expect(await stakingVe.connect(alice).GetMyPower()).to.eq(5);
       expect(await stakingVe.connect(bob).GetMyPower()).to.eq(50);
       expect(await stakingVe.connect(carol).GetMyPower()).to.eq(250);
    });

    it("user should be able to claim their tokens", async () => {
       await axialTokenMock.connect(alice).approve(stakingVe.address, '10');
       await stakingVe.connect(alice).CreateLock(TWO_YEARS, '10');

       await increaseTimestamp(TWO_YEARS/2);

       await stakingVe.connect(alice).ClaimMyFunds();
       let balance = await stakingVe.connect(alice).GetMyBalance();
       expect(
         await axialTokenMock.balanceOf(await alice.getAddress())
       ).to.eq(balance);

       await increaseTimestamp(TWO_YEARS/2);
       await stakingVe.connect(alice).ClaimMyFunds();
       expect(
         await axialTokenMock.balanceOf(await alice.getAddress())
       ).to.eq(10);
    });


    it("user should not be able to steal funds", async () => {
       await axialTokenMock.connect(alice).approve(stakingVe.address, '10');
       await axialTokenMock.connect(bob).approve(stakingVe.address, '100');

       await stakingVe.connect(alice).CreateLock(TWO_YEARS, '10');
       await stakingVe.connect(bob).CreateLock(TWO_YEARS, '100');

       await increaseTimestamp(TWO_YEARS/2);

       const balance = await stakingVe.GetBalance(await alice.getAddress());

       await stakingVe.connect(alice).ClaimMyFunds();
       await stakingVe.connect(alice).ClaimMyFunds();
       await stakingVe.connect(alice).ClaimMyFunds();
       await stakingVe.connect(alice).ClaimMyFunds();
       await stakingVe.connect(alice).ClaimMyFunds();
       await stakingVe.connect(alice).ClaimMyFunds();

       expect(
         await axialTokenMock.balanceOf(await alice.getAddress())
       ).to.be.gt(0);

       expect(
         await axialTokenMock.balanceOf(await alice.getAddress())
       ).to.be.at.most(balance);
    });

    it("user should be able to increase their lock duration", async () => {});
    it("user should not be able to decrease their lock duration", async () => {});

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
