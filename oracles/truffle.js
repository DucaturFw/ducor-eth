require("dotenv").config();
require("babel-register")({
  ignore: /node_modules\/(?!zeppelin-solidity)/
});
require("babel-polyfill");

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // eslint-disable-line camelcase
    },
    docker: {
      host: process.env.DUCOR_ETH_HOST,
      port: 8545,
      network_id: "*" // eslint-disable-line camelcase
    }
  }
};
