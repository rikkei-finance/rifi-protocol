# 1. Sử dụng chainlink thay thế SimplePriceOracle
+ Chainlink đã hỗ trợ tự động cập nhật tỉ giá của các đồng từ chainlink nên mạng BSC.
   + Đối với testnetBSC:
        + BUSD/USD [0x9331b55D9830EF609A2aBCfAc0FBCE050A52fdEa](https://testnet.bscscan.com/address/0x9331b55D9830EF609A2aBCfAc0FBCE050A52fdEa)
        + BNB/USD [0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526](https://testnet.bscscan.com/address/0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526)   + Đối với testnetBSC:
   + Đối với BSC mainnet:
        + BUSD/USD [0xcBb98864Ef56E9042e7d2efef76141f15731B82f](https://bscscan.com/address/0xcBb98864Ef56E9042e7d2efef76141f15731B82f)
        + BNB/USD [0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE](https://bscscan.com/address/0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE)
+ Thay vì set gía bằng tay trong SimplePriceOracle như cũ, hàm ```getUnderlyingPrice``` trong contract này sẽ gọi đến địa chỉ contract của chainlink
để lấy tỉ gía giữa 2 đồng.

Hàm ```getUnderlyingPrice``` sẽ được sửa lại như sau:

```solidity
function getUnderlyingPrice(RToken rToken) public view returns (uint) {
    (uint80 roundId,int256 answer,uint256 startedAt,uint256 updatedAt,uint80 answeredInRound) = oracleData[address(rToken)].latestRoundData();
    return 10 ** 10 * uint(answer);
}
```
Tuy nhiên theo [Chainlink](https://docs.chain.link/docs/binance-smart-chain-addresses/) như sau:

```Note, off-chain equity and ETF assets are only traded during standard market hours (9:30 am - 4 pm ET M-F). Using these feeds outside of those windows is not recommended.```

Khi đó cần có biện pháp khác khắc phục vấn đề này như việc dùng thêm 1 số thằng khác.


# 2. Deploy
## 2.1 Testnet
1. Điền mnemonic vào file .secret
2. Chạy lệnh ```truffle build``` để tiến hành compile toàn bộ contract
3. Chạy lệnh ```truffle test test/DeployTestnet.js --network testnet``` để tự động triển khai và test luồng nạp tiền, rút tiền, thế chấp , vay,
   trả tiền đã vay (đơn giản)

## 2.2 Mainnet (chưa test)
1. Điền mnemonic vào file .secret (nếu file .secret trống)
2. Chạy lệnh ```truffle build``` để tiến hành compile toàn bộ contract
3. Chạy lệnh ```truffle test  test/DeployMainnet.js --network mainnet``` để tự động triển khai code lên mainnet
