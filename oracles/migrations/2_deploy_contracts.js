var MasterOracle = artifacts.require("./MasterOracle.sol");
var DataConsumer = artifacts.require("./DataConsumer.sol");
var MultiDataConsumer = artifacts.require("./MultiDataConsumer.sol");
var MTDataConsumer = artifacts.require("./MultiTypeDataConsumer.sol");

module.exports = function(deployer) {
    deployer.deploy(MasterOracle).then(() => {
        console.log('MASTER ORACLE ADDRESS: ', MasterOracle.address)
        deployer.deploy(DataConsumer,
            '0x0abc123', 10, 10 * Math.pow(10, 10),
            MasterOracle.address, 0x0, 100, 100000);
        deployer.deploy(MultiDataConsumer, MasterOracle.address, 0);
        deployer.deploy(MTDataConsumer, MasterOracle.address, 0);
    });
};
