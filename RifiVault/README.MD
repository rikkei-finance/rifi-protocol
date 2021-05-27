#1.  CODE
```solidity
contract RifiVault {
    struct UserInfo {
        uint256 amount;     // Số lượng token được nạp vào
        uint256 rewardDebt; // Số lượng reward được thưởng tại thời điểm đó ứng với số lượng amount ở trên
        uint256 currentRewardStored; // Số lượng reward được thưởng ở thời điểm update
    }

    struct PoolInfo {
        IBEP20 lpToken; //address của  token cho phép nạp vào
        uint256 allocPoint; // giá trị liên quan đến việc chia thưởng. Thường đối với mỗi pool = rewardPerBlock*allocPoint/totalAllocPoint
        uint256 lastRewardBlock; //block.number lúc được cập nhật
        uint256 accOraiPerShare; // Số thưởng Orai tích luỹ với mỗi 1 token được cung cấp.  accOraiPerShare*curentUserAmout - rewardDebt = số thưởng một người nhận được giữa khoảng thời gian
    }

    // The REWARD TOKEN!
    address public rewardToken;
    // Dev address.
    address public governance;
    // tokens created per block.
    uint256 public rewardPerBlock;

    // Danh sách các pool người dùng có thể nạp tiền được vào.
    PoolInfo[] public poolInfo;

    // Thông tin về mỗi người dùng nạp vào mỗi pool
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    // Tổng số trọng số.
    uint256 public totalAllocPoint = 0;

    /**
    * _orai: orai token
    * _oraiPerBlock: số lượng orai thưởng trên 1 block
    **/
    constructor(
        address _rewardToken,
        uint256 _rewardPerBlock
    ) public {
        rewardToken = _rewardToken;
        rewardPerBlock = _rewardPerBlock;
        governance = msg.sender;
    }


    modifier onlyOwner(){
        require(msg.sender == governance, "Forbidden");
        _;
    }
    function setGovernance(address _gov) public onlyOwner {
        governance = _gov;
    }

    //Thay đổi lượng thưởng block = _rewardPerBlock. Nếu _withUpdate = true, thì tức là thay đổi ở block hiện tại, còn
    // nêú không là thay đổi ở block cuối cùng được update (lastRewardBlock ứng với mỗi pool)
    // **note: nên dùng _withUpdate == True.
    function setRewardPerBlock(uint256 _rewardPerBlock, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        rewardPerBlock = _rewardPerBlock;
    }


    // Số lượng loại token cho phép người dùng được nạp vào;
    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    /**
    * Thêm 1 loại token cho phép người dùng nạp vào.
    * _allocPoint: liên quan đến việc chia thưởng
    * _token: địa chỉ token được thêm vào.
    * _withUpdate: có cập nhật reward, last block update không
    ** note: nên để withUpdate = true
    **/
    function add(uint256 _allocPoint, IBEP20 _token, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 lastRewardBlock = block.number;
        totalAllocPoint = totalAllocPoint.add(_allocPoint);
        poolInfo.push(
            PoolInfo({token : _token, allocPoint : _allocPoint, lastRewardBlock : lastRewardBlock, accRewardTokenPerShare : 0})
        );
    }

    /**
      * Thêm 1 loại token cho phép người dùng nạp vào.
      * _pid: chỉ số của token cần thay đổi _allocPoint
      * _allocPoint: Giá trị thay đổi.
      * _withUpdate: có cập nhật reward, last block update không
      ** note: nên để withUpdate = true
    **/
    function set(uint256 _pid, uint256 _allocPoint, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);
        poolInfo[_pid].allocPoint = _allocPoint;
    }



    // Trả về lượng hiện tại thưởng của 1 người đối với 1 pool
    function pendingReward(uint256 _pid, address _user) public view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accRewardTokenPerShare = pool.accRewardTokenPerShare;
        uint256 lpSupply = pool.token.balanceOf(address(this));
        if (block.number > pool.lastRewardBlock && lpSupply != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            uint256 rewardAmount = multiplier.mul(rewardPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
            accRewardTokenPerShare = accRewardTokenPerShare.add(rewardAmount.mul(1e12).div(lpSupply));
        }
        return user.amount.mul(accRewardTokenPerShare).div(1e12).sub(user.rewardDebt).add(user.currentRewardStored);
    }

    // Update reward vairables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }
        uint256 lpSupply = pool.token.balanceOf(address(this));
        if (lpSupply == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
        uint256 rewardAmount = multiplier.mul(rewardPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
        pool.accRewardTokenPerShare = pool.accRewardTokenPerShare.add(rewardAmount.mul(1e12).div(lpSupply));
        pool.lastRewardBlock = block.number;
    }

    // Nạp đồng token vào vault (cần approve đồng đó vào trước)
    function deposit(uint256 _pid, uint256 _amount) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);
        if (user.amount > 0) {
            uint256 additionalReward = user.amount.mul(pool.accRewardTokenPerShare).div(1e12).sub(user.rewardDebt);
            user.currentRewardStored = user.currentRewardStored.add(additionalReward);
            emit UpdateReward(msg.sender, _pid, additionalReward, user.currentRewardStored);
        }
        pool.token.safeTransferFrom(address(msg.sender), address(this), _amount);
        user.amount = user.amount.add(_amount);
        user.rewardDebt = user.amount.mul(pool.accRewardTokenPerShare).div(1e12);
        emit Deposit(msg.sender, _pid, _amount);
    }

    // Rút đồng token ra khỏi vault
    function withdraw(uint256 _pid, uint256 _amount) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool(_pid);
        uint256 additionalReward = user.amount.mul(pool.accRewardTokenPerShare).div(1e12).sub(user.rewardDebt);
        user.currentRewardStored = user.currentRewardStored.add(additionalReward);
        emit UpdateReward(msg.sender, _pid, additionalReward, user.currentRewardStored);
        user.amount = user.amount.sub(_amount);
        user.rewardDebt = user.amount.mul(pool.accRewardTokenPerShare).div(1e12);
        pool.token.safeTransfer(address(msg.sender), _amount);
        emit Withdraw(msg.sender, _pid, _amount);
    }

    // Nhận thưởng đồng token ứng với vault có chỉ số _pid
    function claim(uint256 _pid, uint256 _amount) external {
        updatePool(_pid);
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        uint256 additionalReward = user.amount.mul(pool.accRewardTokenPerShare).div(1e12).sub(user.rewardDebt);
        uint256 currentReward = user.currentRewardStored.add(additionalReward);
        user.rewardDebt = user.amount.mul(pool.accRewardTokenPerShare).div(1e12);
        require(_amount < currentReward, "invalid reward amount");
        IBEP20(rewardToken).safeTransfer(address(msg.sender), _amount);
        user.currentRewardStored = currentReward.sub(_amount);
        emit UpdateReward(msg.sender, _pid, additionalReward, user.currentRewardStored);


    }

    // Nhận thưởng max
    function claimMax(uint256 _pid) external {
        updatePool(_pid);
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        uint256 additionalReward = user.amount.mul(pool.accRewardTokenPerShare).div(1e12).sub(user.rewardDebt);
        uint256 currentReward = user.currentRewardStored.add(additionalReward);
        IBEP20(rewardToken).safeTransfer(address(msg.sender), currentReward);
        user.currentRewardStored = 0;
        emit UpdateReward(msg.sender, _pid, additionalReward, user.currentRewardStored);

    }

}
```
# 2. Công thức tính thưởng:
Khởi tạo: pool.accRewardTokenPerShare mỗi pool = 0, user.rewardDebt = 0

Mỗi khi có nạp tiền, rút tiền , rút thưởng, rút thưởng max thì sẽ cập nhật lại pool và userReward.
Khi cập nhật:

1. `accRewardTokenPerShare += deltaTime *rewardPerBlock * poolAllocPoint/(totalAllocPoint*totalTokenOfPool)`

2. `userReward = user.amount*pool.accRewardTokenPerShare - user.rewardDebt`

3. `currentRewardStored += userReward`

4. `user.rewardDebt = user.amount*pool.accRewardTokenPerShare`

# 3. Run

1. `npm i`

2. `truffle test  --network testnet`