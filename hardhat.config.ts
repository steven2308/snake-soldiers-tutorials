import * as dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import 'hardhat-contract-sizer';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.16',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    goerli: {
      url: process.env.GOERLI_URL || '',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    moonbaseAlpha: {
      url: 'https://rpc.testnet.moonbeam.network',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    moonriver: {
      url: 'https://rpc.api.moonriver.moonbeam.network',
      chainId: 1285, // (hex: 0x505),
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    moonbeam: {
      url: 'https://rpc.api.moonbeam.network',
      chainId: 1284, // (hex: 0x504),
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      goerli: process.env.ETHERSCAN_API_KEY || '', // Goerli Etherscan API Key
      moonbaseAlpha: process.env.MOONBEAM_MOONSCAN_APIKEY || '', // Moonbeam Moonscan API Key
      moonriver: process.env.MOONRIVER_MOONSCAN_APIKEY || '', // Moonriver Moonscan API Key
      moonbeam: process.env.MOONBEAM_MOONSCAN_APIKEY || '', // Moonbeam Moonscan API Key
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
    coinmarketcap: process.env.COIN_MARKET_CAP_KEY || '', // Get one here: https://coinmarketcap.com/api/pricing/
    token: 'GLMR',
    gasPriceApi: 'https://api-moonbeam.moonscan.io/api?module=proxy&action=eth_gasPrice',
    // More options: https://github.com/cgewecke/eth-gas-reporter/blob/master/README.md#token-and-gaspriceapi-options-example
  },
};

export default config;
