pragma solidity ^0.4.24;
import './MasterOracle.sol';

contract DataConsumer {
  address data_provider;
  address data_publisher;
  string data_type;
  uint public last_update;
  uint value;
  uint public update_time;
  uint public life_time;
  uint8 public decimals;

  constructor(string name, uint8 decimals_, uint value_,
              address master_oracle, address data_pub,
              uint update_time_, uint life_time_) public {
    data_type = name;
    decimals = decimals_;
    value = value_;
    data_provider = master_oracle;
    data_publisher = data_pub;
    update_time = update_time_;
    life_time = life_time_;
    last_update = block.number;
  }

  modifier onlyDataPublisher() {
      require(data_publisher == msg.sender);
      _;
  }

  /**
   * Check data age:
   * returns true, if data is valid;
   * returns false, if data needs to be updated;
   * throws error, if data is outdated (manual update call needed).
   */
  function check_data_age() view private returns(bool) {
      require(block.number < last_update + life_time);
      return block.number < (last_update + update_time);
  }

  function push_data(string name, uint value_) onlyDataPublisher public {
      last_update = block.number;
      value = value_;
      data_type = name;
  }

  function request_data() private {
      MasterOracle master = MasterOracle(data_provider);
      master.request_data(data_type, this);
  }

  function getValue() view public returns (uint) {
      if (!check_data_age()) {
          request_data();
      }
      return value;
  }
}