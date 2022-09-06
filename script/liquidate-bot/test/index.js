const Factory = require("../index");

async function main() {
  const checker = Factory.create(592);
  const tx = await checker.checkBorrower("0xbb61B7e4Ca4d4deeBf57Db43B49cC5ed1892c8EE");
  console.log(tx)
}

main()