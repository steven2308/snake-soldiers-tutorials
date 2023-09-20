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
    version: '0.8.21',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    moonbaseAlpha: {
      url: 'https://rpc.testnet.moonbeam.network',
      chainId: 1287, // (hex: 0x507)
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 1100000000,
    },
    moonbeam: {
      url: 'https://moonbeam.blastapi.io/f83b94ac-46b2-496d-89c2-5100f235a424',
      chainId: 1284, // (hex: 0x504),
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 180000000000,
    },
  },
  etherscan: {
    apiKey: {
      moonbaseAlpha: process.env.MOONBEAM_MOONSCAN_APIKEY || '', // Moonbeam Moonscan API Key
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
