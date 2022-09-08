const Factory = require("../index");

async function main() {
  const chainId = 81;
  const checker = Factory.create(chainId);
  if (!checker) {
    console.log(`Network ${chainId} is not supported`);
    return;
  }
  const tx = await checker.checkBorrower("0x97bb86B0bec77b6dd0e276509D0E1B8564f154C7");
  console.log(tx)
}

main()