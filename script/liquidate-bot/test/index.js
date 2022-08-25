const { checkBorrower } = require("../index");

async function main() {
 const tx = await checkBorrower("0x13c817485b00e319eA9e9722BDd682425224A5dF");
 console.log(tx)
}

main()