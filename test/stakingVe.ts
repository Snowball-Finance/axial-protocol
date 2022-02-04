import { constants } from "ethers"
import { solidity } from "ethereum-waffle"

import { TestMathUtils } from "../build/typechain/TestMathUtils"
import chai from "chai"
import { ethers } from "hardhat"

chai.use(solidity)
const { expect } = chai

describe("StakingVe", () => {

  beforeEach(async () => {
  })

  before(async () => {
  //    let [alice, bob] = ethers.getSigner();
  })

  describe("::constructor", () => {

    it("deployment works", async () => {});
    it("ensure privates", async () => {});

  })

  describe("::CreateLock", () => {
    /**
     * alice: x ----------------------- 0
     *                y ----------------------- 0
     * alice: LOT a money short time 
     */

    // define?
    it("max lock time", async () => {});
    it("min lock time", async () => {});

    // 
    it("lock decay immediate", async () => {});
    it("lock decay parital", async () => {});
    it("lock decay fully", async () => {});

    it("user can not create lock with 0 amount", async () => {});

    // minimum amount
    it("user can not create lock below minimum amount", async () => {});
    it("user can not create lock with 0 duration", async () => {});
    it("user can not create lock with more tokens then they have", async () => {});

    it("user can create lock", async () => {});
    it("user's can create multiple locks", async () => {});

    it("multi user", async () => {});

  })

  describe("::GetMyLocks", () => {
    it("get lock single", async () => {});
    it("get multiple locks", async () => {});
  })

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

})
