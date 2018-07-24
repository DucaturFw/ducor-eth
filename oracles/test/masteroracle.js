const MasterOracle = artifacts.require("./MasterOracle.sol");

contract('MasterOracle', (accounts) => {
    const data_type = 'some_data_type';
    it("should rise event on data request", function() {
        return MasterOracle.new().then((instance) => {
            return instance.request_data(data_type, accounts[0], { from: accounts[0] });
        }).then((resultTx) => {
            assert.equal(resultTx.logs[0].event, 'DataRequest',
                "The data request should be created");
            assert.equal(resultTx.logs[0].args.name, data_type, "Data type should match");
            assert.equal(resultTx.logs[0].args.receiver, accounts[0], "Receiver address should match");
        });
    });
});