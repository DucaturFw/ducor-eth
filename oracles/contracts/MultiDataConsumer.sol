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

  constructor(address master_oracle, address data_pub) Ownable() {
      data_provider = master_oracle;
      data_publisher = data_pub;
  }

  modifier onlyDataPublisher() {
      require(data_publisher == msg.sender);
      _;
  }

  modifier ownerOrPublisher() {
      require(owner == msg.sender || data_publisher == msg.sender);
      _;
  }

  modifier nonEmptyLife(string name) {
      require(data_vals[name].life_time != 0);
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

  function addDataType(string name, uint8 decimals, uint update_time, uint life_time) ownerOrPublisher public {
      data_vals[name] = Data(0, decimals, update_time, life_time, 0);
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

  function request_data_manually(string name) nonEmptyLife(name) dataAntique(name) public {
      MasterOracle master = MasterOracle(data_provider);
      master.request_data(name, this);
  }

  function request_data(string name) nonEmptyLife(name) dataNeedRefresh(name) private {
      MasterOracle master = MasterOracle(data_provider);
      master.request_data(name, this);
  }

  function getValue(string name) dataFresh(name) public returns (uint) {
      if (!check_data_age(name)) {
          request_data(name);
      }
      return data_vals[name].value;
  }

  function last_update(string name) view public returns(uint) {
      return data_vals[name].last_update;
  }

  function life_time(string name) view public returns(uint) {
      return data_vals[name].life_time;
  }

  function getDecimals(string name) view public returns (uint) {
      return data_vals[name].decimals;
  }
}