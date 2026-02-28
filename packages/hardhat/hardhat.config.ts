import * as dotenv from "dotenv";
dotenv.config();
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomicfoundation/hardhat-verify";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import { task } from "hardhat/config";
import generateTsAbis from "./scripts/generateTsAbis";

const deployerPrivateKey =
  process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY ||
  (process.env.PRIVATE_KEY
    ? process.env.PRIVATE_KEY.startsWith("0x")
      ? process.env.PRIVATE_KEY
      : `0x${process.env.PRIVATE_KEY}`
    : "");

const monadRpcUrl = process.env.ALCHEMY_TESTNET_URL || "https://monad-testnet.g.alchemy.com/v2/E7i9vdsCC8gVkU0Bh0Km-";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.30",
        settings: {
          optimizer: {
            enabled: true,
            // https://docs.soliditylang.org/en/latest/using-the-compiler.html#optimizer-options
            runs: 200,
          },
        },
      },
    ],
  },
  defaultNetwork: "localhost",
  namedAccounts: {
    deployer: {
      // By default, it will take the first Hardhat account as the deployer
      default: 0,
    },
  },
  networks: {
    // View the networks that are pre-configured.
    // If the network you are looking for is not here you can add new network settings
    monadTestnet: {
      url: monadRpcUrl,
      chainId: 10143,
      accounts: deployerPrivateKey ? [deployerPrivateKey] : [],
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  // Configuration for harhdat-verify plugin
  etherscan: {
    customChains: [
      {
        network: "monadTestnet",
        chainId: 10143,
        urls: {
          apiURL: "https://testnet.monadvision.com/api",
          browserURL: "https://testnet.monadvision.com",
        },
      },
    ],
  },
  // Configuration for etherscan-verify from hardhat-deploy plugin
  sourcify: {
    enabled: false,
  },
};

// Extend the deploy task
task("deploy").setAction(async (args, hre, runSuper) => {
  // Run the original deploy task
  await runSuper(args);
  // Force run the generateTsAbis script
  await generateTsAbis(hre);
});

export default config;
