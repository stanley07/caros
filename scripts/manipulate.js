const hre = require("hardhat")
require("dotenv").config()

// -- IMPORT HELPER FUNCTIONS & CONFIG -- //
const { getTokenAndContract, getPairContract, calculatePrice } = require('../helpers/helpers')
const { provider, uFactory, uRouter, sFactory, sRouter } = require('../helpers/initialization.js')

// -- CONFIGURE VALUES HERE -- //
const V2_FACTORY_TO_USE = uFactory
const V2_ROUTER_TO_USE = uRouter

const UNLOCKED_ACCOUNT = '0xdEAD000000000000000042069420694206942069' // SHIB account to impersonate 
const AMOUNT = '40500000000000' // 40,500,000,000,000 SHIB -- Tokens will automatically be converted to wei

async function main() {
  // Fetch contracts
  const {
    token0Contract,
    token1Contract,
    token0: ARB_AGAINST,
    token1: ARB_FOR
  } = await getTokenAndContract(process.env.ARB_AGAINST, process.env.ARB_FOR, provider)

  const pair = await getPairContract(V2_FACTORY_TO_USE, ARB_AGAINST.address, ARB_FOR.address, provider)

  // Fetch price of SHIB/WETH before we execute the swap
  const priceBefore = await calculatePrice(pair)

  await manipulatePrice([ARB_AGAINST, ARB_FOR], token0Contract)

  // Fetch price of SHIB/WETH after the swap
  const priceAfter = await calculatePrice(pair)

  const data = {
    'Price Before': `1 WETH = ${Number(priceBefore).toFixed(0)} SHIB`,
    'Price After': `1 WETH = ${Number(priceAfter).toFixed(0)} SHIB`,
  }

  console.table(data)
}

async function manipulatePrice(_path, _token0Contract) {
  console.log(`\nBeginning Swap...\n`)

  console.log(`Input Token: ${_path[0].symbol}`)
  console.log(`Output Token: ${_path[1].symbol}\n`)

  const amount = hre.ethers.utils.parseUnits(AMOUNT, 'ether')
  const path = [_path[0].address, _path[1].address]
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [UNLOCKED_ACCOUNT],
  })

  const signer = await hre.ethers.getSigner(UNLOCKED_ACCOUNT)

  await _token0Contract.connect(signer).approve(V2_ROUTER_TO_USE.address, amount)
  await V2_ROUTER_TO_USE.connect(signer).swapExactTokensForTokens(amount, 0, path, signer.address, deadline)

  console.log(`Swap Complete!\n`)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
