const MasterOracle = artifacts.require("./MasterOracle.sol");

module.exports = async function() {
  const master = await MasterOracle.deployed();
  console.log(master.address);
  console.log(
    await master.request_data(
      "1",
      "0xdf08f82de32b8d460adbe8d72043e3a7e25a3b39",
      {
        from: "0xdf08f82de32b8d460adbe8d72043e3a7e25a3b39"
      }
    )
  );
};
