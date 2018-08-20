pragma solidity ^0.4.24;
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

contract MasterOracle is Ownable {
    event DataRequest(string name, address receiver, string memo);
    event DataRequest(string name, address receiver, string memo, int[] params);
    function request_data(string name, address receiver, string memo) public {
        emit DataRequest(name, receiver, memo);
    }
    function request_data_args(string name, address receiver, string memo, int[] params) public {
        emit DataRequest(name, receiver, memo, params);
    }
}
