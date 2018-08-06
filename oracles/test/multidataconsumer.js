import advanceToBlock from 'openzeppelin-solidity/test/helpers/advanceToBlock';
const MultiDataConsumer = artifacts.require("./MultiDataConsumer.sol");
const MasterOracle = artifacts.require("./MasterOracle.sol");

contract('MultiDataConsumer', async function(accounts) {
    const data_type = 'some_data_type';
    const new_type = 'some_new_data';
    let master, instance;
    it("should deploy contracts", async() => {
        master = await MasterOracle.new();
        instance = await MultiDataConsumer.new(master.address, accounts[1], { from: accounts[0] });
    });

    it("should not add data types by non-owner or publisher", async() => {
        try {
            await instance.addDataType(data_type, 4, 2, 7, { from: accounts[3] });
            assert.equal(false, true, "should not be called");
        } catch (e) {
            assert.equal(true, true, "Error is raised");
        }
    });

    it("should add 2 data types", async() => {
        await instance.addDataType(data_type, 4, 2, 7, { from: accounts[0] });
        assert.equal(await instance.last_update(data_type), 0, 'should be updated on 0');
        assert.equal(await instance.life_time(data_type), 7, 'should be set to 7');
        assert.equal(await instance.getDecimals(data_type), 4, 'should be set to 4');

        await instance.addDataType(new_type, 1, 2, 6, { from: accounts[1] });
        assert.equal(await instance.last_update(new_type), 0, 'should be updated on 0');
        assert.equal(await instance.life_time(new_type), 6, 'should be set to 6');
        assert.equal(await instance.getDecimals(new_type), 1, 'should be set to 1');
    });

    it("should update data by publisher", async() => {
        await instance.push_data(data_type, 100, { from: accounts[1] });
        assert.equal(await instance.last_update(data_type), web3.eth.blockNumber, 'should change last update time for data');
        assert.equal(await instance.getValue.call(data_type), 100, "Value should match for data");

        await instance.push_data(new_type, 200, { from: accounts[1] });
        assert.equal(await instance.last_update(new_type), web3.eth.blockNumber, 'should change last update time for new data');
        assert.equal(await instance.getValue.call(new_type), 200, "Value should match for new data");
    });

    it("should not update data by stranger", async() => {
        try {
            await instance.push_data(data_type, 123, { from: accounts[4] });
            assert.equal(false, true, "should not be called");
        } catch (e) {
            assert.equal(true, true, "Error should be raised on wrong publisher update");
        }
    });

    it("should return value until data is not antique", async function() {
        await advanceToBlock(web3.eth.blockNumber + 2);
        const resTx = await instance.getValue(data_type, { from: accounts[0] });
        assert.isAtLeast(resTx.receipt.gasUsed, 1000, "Transaction should happen and event emitted internally");
        await advanceToBlock(web3.eth.blockNumber + 6);
        try {
            await instance.getValue(data_type, { from: accounts[0] });
            assert.equal(false, true, "Should not be called");
        } catch (e) {
            assert.equal(true, true, "Error should be raised");
        }
    });

    it("should request data update manually", async() => {
        const resTxManual = await instance.request_data_manually(data_type, { from: accounts[3] });
        assert.isAtLeast(resTxManual.receipt.gasUsed, 1000, "Transaction should happen and event emitted internally");
    });

    it("should not request data update manually for not approved data type", async() => {
        try {
            await instance.request_data_manually('wtf_type', { from: accounts[3] });
            assert.equal(false, true, "should not be called");
        } catch (e) {
            assert.equal(true, true, "Error should be raised");
        }
    });
});