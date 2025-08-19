# Covus Liquid Staking Protocol - Frontend

A modern, user-friendly interface for the Covus liquid staking protocol built with Next.js and Scaffold-ETH 2.

## 🚀 Features

### **User Interface**

- **Stake STT**: Deposit STT to receive liquid csSTT tokens
- **Withdraw STT**: Request withdrawals with instant or queued processing
- **Position Tracking**: Real-time view of your staking position and rewards
- **Protocol Stats**: Live statistics including TVL, exchange rate, and APY

### **Admin Interface**

- **Debug Panel**: Comprehensive testing interface for protocol operations
- **Staking Manager**: Simulate validator operations (stake, rewards, unstake)
- **Reward Distribution**: Test reward reporting and distribution mechanisms

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with DaisyUI
- **Web3**: Wagmi + Viem for Ethereum interactions
- **UI Components**: Heroicons, custom React components
- **State Management**: React hooks with Scaffold-ETH 2 utilities

## 📁 Project Structure

```
packages/nextjs/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main Covus interface
│   ├── debug/             # Admin debug interface
│   └── blockexplorer/     # Transaction explorer
├── components/            # React components
│   ├── scaffold-eth/      # Scaffold-ETH components
│   │   ├── StakingCard.tsx    # Reusable staking interface
│   │   ├── StatsCard.tsx      # Protocol statistics display
│   │   └── PositionCard.tsx   # User position tracking
│   ├── Header.tsx         # Navigation header
│   └── Footer.tsx         # Site footer
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
```

## 🎯 User Guide

### **For End Users**

1. **Connect Wallet**: Use the connect button in the header
2. **Stake STT**:
   - Navigate to the "Stake STT" tab
   - Enter the amount you want to stake
   - Click "Stake STT" and confirm the transaction
3. **Track Position**:
   - View your csSTT shares and staked value
   - Monitor exchange rate and your share percentage
4. **Withdraw**:
   - Use the "Withdraw" tab to request withdrawals
   - Choose between instant (if liquidity available) or queued withdrawals

### **For Testers/Developers**

1. **Setup**:

   - Run `yarn chain` to start local blockchain
   - Run `yarn deploy` to deploy contracts
   - Run `yarn start` to start the frontend

2. **Testing Flow**:

   - Use the Debug page (`/debug`) to simulate protocol operations
   - Fund the StakingManager with STT
   - Test staking, rewards, and unstaking operations
   - Return to main page to test user interactions

3. **Protocol Simulation**:
   ```
   1. Fund StakingManager → 2. Stake STT → 3. Send Rewards →
   4. Report Rewards → 5. Test User Deposits → 6. Test Withdrawals
   ```

## 🎨 UI Components

### **StakingCard**

- Reusable component for stake/withdraw operations
- Handles input validation and transaction submission
- Shows available balances and processing states

### **StatsCard**

- Displays protocol statistics with icons and colors
- Supports different color themes (blue, green, purple, orange, red)
- Responsive design for mobile and desktop

### **PositionCard**

- Comprehensive view of user's staking position
- Shows balances, protocol stats, and share percentage
- Includes progress bar for visual representation

## 🔧 Development

### **Adding New Components**

1. Create component in `components/scaffold-eth/`
2. Export from `components/scaffold-eth/index.tsx`
3. Import and use in pages

### **Styling Guidelines**

- Use Tailwind CSS classes
- Follow dark mode support with `dark:` prefixes
- Maintain consistent spacing and typography
- Use Heroicons for consistent iconography

### **Contract Integration**

- Use `useScaffoldReadContract` for reading data
- Use `useScaffoldWriteContract` for transactions
- Handle loading states and error messages
- Format numbers with `formatEther` from Viem

## 🚀 Deployment

### **Local Development**

```bash
yarn install
yarn chain      # Start local blockchain
yarn deploy     # Deploy contracts
yarn start      # Start frontend
```

### **Production**

- Configure environment variables
- Set up proper network configuration
- Deploy contracts to target network
- Build and deploy frontend

## 📊 Monitoring

### **Key Metrics to Track**

- Total Value Locked (TVL)
- Exchange rate changes
- User deposit/withdrawal patterns
- Queue processing times
- Gas usage optimization

### **Error Handling**

- Transaction failures
- Network connectivity issues
- Contract interaction errors
- User input validation

## 🔒 Security Considerations

- Input validation on all user inputs
- Proper error handling and user feedback
- Secure wallet connection handling
- Transaction confirmation flows
- Rate limiting for API calls

## 🤝 Contributing

1. Follow the existing code structure
2. Add proper TypeScript types
3. Include error handling
4. Test on local network first
5. Update documentation as needed

---

**Built with ❤️ using Scaffold-ETH 2**
