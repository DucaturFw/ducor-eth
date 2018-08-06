pragma solidity ^0.4.24;
import './MasterOracle.sol';

contract MultiTypeDataConsumer {
  address data_provider;
  address data_publisher;
  struct Data {
    uint update_time;
    uint life_time;
    uint last_update;
  }
  struct Price {
    uint value;  
    uint8 decimals;
  }
  mapping(string => Data) data_time;
  mapping(string => string) s_data;
  mapping(string => int) i_data;
  mapping(string => uint) u_data;
  mapping(string => Price) p_data;

  constructor(address master_oracle, address data_pub) {
      data_provider = master_oracle;
      data_publisher = data_pub;
      // int set example
      data_time["intval"] = Data(2, 6, block.number);
      i_data["intval"] = 1000;
      // string set example
      data_time["stringval"] = Data(10, 100, block.number);
      s_data["stringval"] = 'unique string';
      // price set example
      data_time["priceval"] = Data(2, 6, block.number);
      p_data["priceval"] = Price(1000, 2);
  }

  modifier onlyDataPublisher() {
      require(data_publisher == msg.sender);
      _;
  }

  modifier nonEmptyLife(string name) {
      require(data_time[name].life_time != 0);
      _;
  }

  modifier dataAntique(string name) {
      require(block.number > data_time[name].last_update + data_time[name].life_time);
      _;
  }

  modifier dataFresh(string name) {
      require(block.number < data_time[name].last_update + data_time[name].life_time);
      _;
  }

  modifier dataNeedRefresh(string name) {
      require(block.number > data_time[name].last_update + data_time[name].update_time);
      _;
  }

  /**
   * Check data age:
   * returns true, if data is valid;
   * returns false, if data needs to be updated;
   * throws error, if data is outdated (manual update call needed).
   */
  function check_data_age(string name) dataFresh(name) view private returns(bool) {
      return block.number < (data_time[name].last_update + data_time[name].update_time);
  }

  function push_data_str(string name, string s_value) onlyDataPublisher public {
      data_time[name].last_update = block.number;
      s_data[name] = s_value;
  }

  function push_data(string name, int value) onlyDataPublisher public {
      data_time[name].last_update = block.number;
      i_data[name] = value;
  }

  function push_data_price(string name, uint value, uint8 decimals) onlyDataPublisher public {
      data_time[name].last_update = block.number;
      p_data[name] = Price(value, decimals);
  }

  function push_data_uint(string name, uint value) onlyDataPublisher public {
      data_time[name].last_update = block.number;
      u_data[name] = value;
  }

  function request_data_manually(string name) nonEmptyLife(name) dataAntique(name) public {
      MasterOracle master = MasterOracle(data_provider);
      master.request_data(name, this);
  }

  function request_data(string name) nonEmptyLife(name) dataNeedRefresh(name) private {
      MasterOracle master = MasterOracle(data_provider);
      master.request_data(name, this);
  }

  function getDecimals(string name) dataFresh(name) public view returns(uint8) {
      return p_data[name].decimals;
  }

  function getPriceVal() dataFresh("priceval") public returns (uint) {
      if (!check_data_age("priceval")) {
          request_data("priceval");
      }
      return p_data["priceval"].value;
  }

  function getIntVal() dataFresh("intval") public returns (int) {
      if (!check_data_age("intval")) {
          request_data("intval");
      }
      return i_data["intval"];
  }

  function getStringVal() dataFresh("stringval") public returns (string) {
      if (!check_data_age("stringval")) {
          request_data("stringval");
      }
      return s_data["stringval"];
  }
}