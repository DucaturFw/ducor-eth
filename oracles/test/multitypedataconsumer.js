import advanceToBlock from 'openzeppelin-solidity/test/helpers/advanceToBlock';
const MultiTypeDataConsumer = artifacts.require("./MultiTypeDataConsumer.sol");
const MasterOracle = artifacts.require("./MasterOracle.sol");

contract('MultiTypeDataConsumer', async function(accounts) {
    const int_type = 'intval';
    const string_type = 'stringval';
    let master, instance;
    let new_int_val = 40000;
    let new_string_val = 'super string';

    it("should deploy contracts", async() => {
        master = await MasterOracle.deployed();
        instance = await MultiTypeDataConsumer.new(master.address, accounts[1], { from: accounts[0] });
    });

    it("should deploy with init value inserted", async() => {
        assert.equal(await instance.getIntVal.call(), 1000, "Value should match for int val data");
        assert.equal(await instance.getDecimals.call("priceval"), 2, "Decimals should match for int val data");
        assert.equal(await instance.getStringVal.call(), 'unique string', "Value should match for int val data");
    });

    it("should update data by publisher", async() => {
        await instance.push_data(int_type, new_int_val, { from: accounts[1] });
        assert.equal(await instance.getIntVal.call(), new_int_val, "Value should match for int val data");

        await instance.push_data_str(string_type, new_string_val, { from: accounts[1] });
        assert.equal(await instance.getStringVal.call(), new_string_val, "Value should match for new data");
    });

    it("should not update data by stranger", async() => {
        try {
            await instance.push_data(int_type, 123, { from: accounts[4] });
            assert.equal(false, true, "should not be called");
        } catch (e) {
            assert.equal(true, true, "Error should be raised on wrong publisher update");
        }
    });

    it("should return value until data is not antique", async function() {
        await advanceToBlock(web3.eth.blockNumber + 2);
        const resTx = await instance.getIntVal({ from: accounts[0] });
        assert.isAtLeast(resTx.receipt.gasUsed, 1000, "Transaction should happen and event emitted internally");
        await advanceToBlock(web3.eth.blockNumber + 6);
        try {
            await instance.getStringVal({ from: accounts[0] });
            assert.equal(false, true, "Should not be called");
        } catch (e) {
            assert.equal(true, true, "Error should be raised");
        }
    });

    it("should request data update manually", async() => {
        const resTxManual = await instance.request_data_manually(int_type, { from: accounts[3] });
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