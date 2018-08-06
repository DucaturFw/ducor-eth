export const EXAMPLE_CONTRACT = `pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

contract MasterOracle is Ownable {
    event DataRequest(string name, address receiver);
    function request_data(string name, address receiver) public {
        emit DataRequest(name, receiver);
    }
}

contract test_contract {
    address data_provider;
    address data_publisher;

    struct Data {
        uint update_time;
        uint life_time;
        uint last_update;
    }
    mapping(string => uint) u_data;
    mapping(string => Data) data_timings;

    constructor(address master_oracle, address data_pub) {
        data_provider = master_oracle;
        data_publisher = data_pub;
        data_timings["aloha"] = Data(2, 10, block.number);
        u_data["aloha"] = 100;
    }

    modifier onlyDataPublisher() {
        require(data_publisher == msg.sender);
        _;
    }

    modifier nonEmptyLife(string name) {
        require(data_timings[name].life_time != 0);
        _;
    }

    modifier dataAntique(string name) {
        require(block.number > data_timings[name].last_update + data_timings[name].life_time);
        _;
    }

    modifier dataFresh(string name) {
        require(block.number < data_timings[name].last_update + data_timings[name].life_time);
        _;
    }

    modifier dataNeedRefresh(string name) {
        require(block.number > data_timings[name].last_update + data_timings[name].update_time);
        _;
    }

    /**
     * Check data age:
     * returns true, if data is valid;
     * returns false, if data needs to be updated;
     * throws error, if data is outdated (manual update call needed).
     */
    function check_data_age(string name) dataFresh(name) view private returns(bool) {
        return block.number < (data_timings[name].last_update + data_timings[name].update_time);
    }

    function push_data_uint(string name, uint value) onlyDataPublisher public {
        data_timings[name].last_update = block.number;
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

    function getaloha() dataFresh("aloha") public returns (uint) {
        if (!check_data_age("aloha")) {
            request_data("aloha");
        }
        return u_data["aloha"];
    }
}`.replace(/\x20+$/gm, "");