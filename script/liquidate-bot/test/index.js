const Factory = require("../index");
const LogService = require("../log");

async function main() {
  const chainId = 592;
  const checker = Factory.create(chainId);
  if (!checker) {
    LogService.log(`Network ${chainId} is not supported`);
    return;
  }
  const tx = await checker.checkBorrower("0x7402fda5EE39B7aaf844d1133364f4Df96c09DD6");
  LogService.log(tx)
}

main()