# Covus - Liquid Staking Protocol

A decentralized liquid staking protocol built with Scaffold-ETH 2, allowing users to stake STT and receive liquid csSTT tokens representing their staked position.

## 🏗️ Architecture

### Core Components

- **CovusVault**: ERC-4626 compliant vault that manages deposits, withdrawals, and share accounting
- **StakingManager**: Mock validator operator for simulating ETH2 staking operations
- **MockWETH**: Wrapped STT implementation for local testing
- **Withdrawal Queue**: FIFO queue system for handling withdrawals when liquidity is insufficient

### Key Features

- ✅ **ERC-4626 Standard**: Compatible with DeFi protocols and aggregators
- ✅ **Instant Withdrawals**: When sufficient liquidity is available
- ✅ **Queued Withdrawals**: FIFO queue for when liquidity is tight
- ✅ **Non-rebasing Shares**: Share value increases via exchange rate appreciation
- ✅ **Mock Staking**: Local simulation of validator operations
- ✅ **Comprehensive Testing**: Full test suite covering all functionality

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.18.3
- Yarn package manager

### Installation

```bash
# Install dependencies
yarn install

# Start local blockchain
yarn chain

# In a new terminal, deploy contracts
yarn deploy

# In a new terminal, start the frontend
yarn start
```

## 📋 Protocol Flow

### 1. Deposit Phase

- User calls `depositSTT()` with STT
- STT is wrapped to WETH and deposited into the vault
- User receives csSTT shares based on current exchange rate

### 2. Staking Phase

- Protocol operator calls `stakeWithManager()` to send WETH to validators
- StakingManager simulates ETH2 deposits (production: real validator infrastructure)

### 3. Rewards Phase

- Validators earn staking rewards
- Rewards are sent back to the vault as STT
- Exchange rate increases, making each csSTT worth more STT

### 4. Withdrawal Phase

- **Instant**: If sufficient liquidity, user can withdraw immediately
- **Queued**: If insufficient liquidity, withdrawal enters FIFO queue

### 5. Queue Processing

- Keeper or anyone can call `processQueue()` to fulfill queued withdrawals
- Withdrawals are processed in order when liquidity becomes available

## 🧪 Testing

```bash
# Run all tests
yarn test

# Run tests with gas reporting
yarn test --gas
```

### Test Coverage

- ✅ Contract deployment and initialization
- ✅ STT deposits and share minting
- ✅ Reward distribution and exchange rate updates
- ✅ Instant withdrawals (STT and WETH)
- ✅ Withdrawal queue mechanics
- ✅ StakingManager integration
- ✅ Admin functions
- ✅ Edge cases and security

## 🔧 Development

### Contract Structure

```
contracts/
├── IWETH.sol              # WETH interface
├── MockWETH.sol           # Mock WETH for testing
├── CovusVault.sol  # Main vault contract
└── StakingManager.sol     # Mock validator operator
```

### Key Functions

#### User Functions

- `depositETH(address receiver)` - Deposit STT, receive csSTT
- `withdraw(uint256 assets, address receiver, address owner)` - Instant withdrawal
- `redeem(uint256 shares, address receiver, address owner)` - Instant redemption
- `requestWithdrawal(uint256 shares, bool toETH)` - Queue withdrawal request

#### Admin Functions

- `reportRewards(uint256 amount)` - Record staking rewards
- `unwrapToETH(uint256 amount)` - Convert WETH to STT
- `wrapETH()` - Convert STT to WETH
- `processQueue(uint256 maxRequests)` - Process queued withdrawals

#### View Functions

- `totalAssets()` - Total vault assets (excluding queued)
- `freeLiquidity()` - Available liquidity for instant withdrawals
- `pendingRequests()` - Number of queued withdrawal requests
- `convertToAssets(uint256 shares)` - Preview STT for shares

## 🌐 Deployment

### Local Development

```bash
yarn deploy
```

### Testnet Deployment

```bash
yarn deploy --network somniaTestnet
```

## 📊 Protocol Metrics

Track these key metrics:

- `totalAssets()` - Total vault value
- `totalSupply()` - Total csSTT supply
- `exchangeRate()` - csSTT to STT conversion rate
- `queuedAssets()` - Assets reserved for queued withdrawals
- `freeLiquidity()` - Available for instant withdrawals
- `pendingRequests()` - Number of queued withdrawal requests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with [Scaffold-ETH 2](https://github.com/scaffold-eth/scaffold-eth-2)
- Inspired by protocols like Lido, RocketPool, and Frax
- Uses OpenZeppelin contracts for security and standards compliance
