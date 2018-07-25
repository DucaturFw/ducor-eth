import advanceToBlock from 'openzeppelin-solidity/test/helpers/advanceToBlock';
const DataConsumer = artifacts.require("./DataConsumer.sol");
const MasterOracle = artifacts.require("./MasterOracle.sol");

contract('DataConsumer', function(accounts) {
    const data_type = 'some_data_type';
    let instance = {};
    it("should return value until data is not antique", function() {
        return MasterOracle.new().then((master) => {
            return DataConsumer.new(
                data_type, 4, 100000,
                master.address, accounts[1],
                5, 20
            )
        }).then(async(_instance) => {
            instance = _instance;
            assert.equal(await instance.last_update(), web3.eth.blockNumber, '');
            return instance.getValue.call();
        }).then(function(value) {
            assert.equal(value, 100000, "Value should match");
            return advanceToBlock(web3.eth.blockNumber + 5);
        }).then(() => {
            return instance.getValue({ from: accounts[0] });
        }).then(async(resTx) => {
            assert.isAtLeast(resTx.receipt.gasUsed, 1000, "Transaction should happen and event emitted internally");
            return advanceToBlock(web3.eth.blockNumber + 20);
        }).then(async() => {
            try {
                await instance.getValue({ from: accounts[0] });
                assert.equal(false, true, "Should not be called");
            } catch (e) {
                assert.equal(true, true, "Error should be raised");
            }
            return instance.request_data_manually({ from: accounts[3] });
        }).then((resTx) => {
            assert.isAtLeast(resTx.receipt.gasUsed, 1000, "Transaction should happen and event emitted internally");
        });
    });

    it("should be changed only by data publisher", function() {
        return MasterOracle.new().then((master) => {
            return DataConsumer.new(
                data_type, 4, 100000,
                master.address, accounts[1],
                0, 15
            )
        }).then(async(_instance) => {
            instance = _instance;
            await advanceToBlock(web3.eth.blockNumber + 1);
            return instance.push_data(data_type, 200, { from: accounts[1] });
        }).then(async(resTx) => {
            assert.equal(await instance.last_update(), web3.eth.blockNumber, '');
            assert.equal(await instance.getValue.call(), 200, "Value should match");
            await advanceToBlock(web3.eth.blockNumber + 5);
            try {
                await instance.push_data(data_type, 123, { from: accounts[4] });
                assert.equal(false, true, "Should not be called");
            } catch (e) {
                assert.equal(true, true, "Error should be raised on wrong publisher update");
            }
            await advanceToBlock(web3.eth.blockNumber + 30);
            try {
                await instance.push_data(data_type, 123, { from: accounts[1] });
                assert.equal(false, true, "Should not be called");
            } catch (e) {
                assert.equal(true, true, "Error should be raised on antique data update");
            }
        });
    });
});