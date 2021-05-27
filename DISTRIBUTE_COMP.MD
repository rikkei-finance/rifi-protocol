# 1. Phân phối đồng RIFI

Đồng RIFI sẽ được phân phối thông qua contract Comtroller.

## 1.1 Set Rifi Speed

```solidity
    function _setRifiSpeed(RToken rToken, uint rifiSpeed) public {
        require(adminOrInitializing(), "only admin can set rifi speed");
        setRifiSpeedInternal(rToken, rifiSpeed);
    }
```

Hàm này được sử dụng để cập nhật số Rifi trên một block (dec = 18).
Khi đó cả supply hoặc borrow thì đều có RifiPerBlock = comSpeed

# 2 Việc cập nhật đồng rifi thưởng với từng người dùng
Mỗi khi có các function liên quan đến việc thay đổi số dư của rToken thì từ rToken sẽ gọi đến bên Comtroller để thay cập
nhật lượng token rifi được thưởng.

Các hàm liên quan đến việc cập nhật từ bên rToken gọi sang bên Comtroller như sau:
### 2.1 mintAllowed
```solidity
function mintAllowed(address rToken, address minter, uint mintAmount) external returns (uint) {
    //....
    updateRifiSupplyIndex(rToken);
    distributeSupplierRifi(rToken, minter);
    return uint(Error.NO_ERROR);
}
```
Hàm này check xem có cho phép mint token hay không và cập nhật số thưởng supply RIFI khi người dùng nạp token vào RToken
### 2.2 redeemAllowed
```solidity
function redeemAllowed(address rToken, address redeemer, uint redeemTokens) external returns (uint) {
    updateRifiSupplyIndex(rToken);
    distributeSupplierRifi(rToken, redeemer);
    return uint(Error.NO_ERROR);
}
```
Hàm này check xem có cho phép redeem token hay không và cập nhật số thưởng supply RIFI khi người dùng rút tiền khỏi RToken

### 2.3 borrowAllowed
```solidity
function borrowAllowed(address rToken, address borrower, uint borrowAmount) external returns (uint) {
    updateRifiBorrowIndex(rToken, borrowIndex);
    distributeBorrowerRifi(rToken, borrower, borrowIndex);
    return uint(Error.NO_ERROR);
}
```
Hàm này check xem có cho phép borrow token hay không và cập nhật số thưởng borrow RIFI khi người dùng vay tiền từ RToken

### 2.4 repayBorrowAllowed
```solidity
function repayBorrowAllowed(
    updateRifiBorrowIndex(rToken, borrowIndex);
    distributeBorrowerRifi(rToken, borrower, borrowIndex);

    return uint(Error.NO_ERROR);
}
```
Hàm này check xem có cho phép borrow token hay không và cập nhật số thưởng borrow RIFI khi người dùng trả tiền cho rToken

### 2.5 seizeAllowed
```solidity
function seizeAllowed(
    updateRifiSupplyIndex(rTokenCollateral);
    distributeSupplierRifi(rTokenCollateral, borrower);
    distributeSupplierRifi(rTokenCollateral, liquidator);

    return uint(Error.NO_ERROR);
}
```
Hàm này check xem có cho phép gửi tiền thế chấp cho liquidator hay không và cập nhật lại số thưởng supply RIFI của cả
borrower và liquidator

### 2.6 transferAllowed

```solidity
function transferAllowed(address rToken, address src, address dst, uint transferTokens) external returns (uint) {
    updateRifiSupplyIndex(rToken);
    distributeSupplierRifi(rToken, src);
    distributeSupplierRifi(rToken, dst);

    return uint(Error.NO_ERROR);
}
```

Hàm này check xem có chuyển tiền được rToken từ src sang dst hay không (tránh trường hợp tiền bị đem thế chấp cho 1
khoản vay và người vay chuyển đó đi) và sau đó cập nhật lại lãi cung cấp đồng RIFI của src và dst

## 2.7. Claim comp
```solidity
function claimRifi(address holder) public {
    return claimRifi(holder, allMarkets);
}
```

Hàm này có tác dụng lấy  đồng RIFI thưởng với tất cả mọi markets(mọi rToken mà người dùng nạp vào) và với cả khoản supply
và borrow

