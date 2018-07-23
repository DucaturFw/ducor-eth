pragma solidity ^0.4.24;
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

contract MasterOracle is Ownable {
    event DataRequest(string name, address receiver);
    function request_data(string name, address receiver) public {
        emit DataRequest(name, receiver);
    }
}