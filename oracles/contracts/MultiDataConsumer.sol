pragma solidity ^0.4.24;
import './MasterOracle.sol';

contract MultiDataConsumer is Ownable {
  address data_provider;
  address data_publisher;
  struct Data {
    uint value;
    uint8 decimals;
    uint update_time;
    uint life_time;
    uint last_update;
  }
  mapping(string => Data) data_vals;

  modifier onlyDataPublisher() {
      require(data_publisher == msg.sender);
      _;
  }

  modifier emptyValue(string name) {
      require(data_vals[name].value == 0);
      _;
  }

  modifier dataAntique(string name) {
      require(block.number > data_vals[name].last_update + data_vals[name].life_time);
      _;
  }

  modifier dataFresh(string name) {
      require(block.number < data_vals[name].last_update + data_vals[name].life_time);
      _;
  }

  modifier dataNeedRefresh(string name) {
      require(block.number > data_vals[name].last_update + data_vals[name].update_time);
      _;
  }

  /**
   * Check data age:
   * returns true, if data is valid;
   * returns false, if data needs to be updated;
   * throws error, if data is outdated (manual update call needed).
   */
  function check_data_age(string name) dataFresh(name) view private returns(bool) {
      return block.number < (data_vals[name].last_update + data_vals[name].update_time);
  }

  function push_data(string name, uint value_) onlyDataPublisher public {
      data_vals[name].last_update = block.number;
      data_vals[name].value = value_;
  }

  function request_data_manually(string name) dataAntique(name) dataNeedRefresh(name) private {
      MasterOracle master = MasterOracle(data_provider);
      master.request_data(name, this);
  }

  function request_data(string name) dataNeedRefresh(name) private {
      MasterOracle master = MasterOracle(data_provider);
      master.request_data(name, this);
  }

  function getValue(string name) dataFresh(name) public returns (uint) {
      if (!check_data_age(name)) {
          request_data(name);
      }
      return data_vals[name].value;
  }

  function getDecimals(string name) view public returns (uint) {
      return data_vals[name].decimals;
  }
}