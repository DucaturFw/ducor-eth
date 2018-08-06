import { VALID_TYPES, DEFAULT_VALUES } from "./consts";

const typeToValueBind = {
    'uint': 'u_value',
    'int': 'value',
    'string': 's_value'
}

export const getNamedGetter = (name, data, type) => {
    return `
  function get${name}() view public returns (${type}) {
      return data_vals[${data}].${typeToValueBind[type]};
}`
}

export const getMasterContract = () => {
    return `
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

contract MasterOracle is Ownable {
    event DataRequest(string name, address receiver);
    function request_data(string name, address receiver) public {
        emit DataRequest(name, receiver);
    }
}`
}

class DataType {
    name = '';
    type = '';
    value;
    decimals = 0;

    constructor({ name, type, value, decimals = 0 }) {
        this.name = name;
        this.type = type;
        this.value = value;
        this.decimals = decimals;
    }
}

const validateType = (type) => !!VALID_TYPES.find(type)
const getTypeBinding = (type) => type[0] + 'value';

class Data {
    binding = '';
    typesOrder = [];
    data = {};

    constructor(binding) {
        this.binding = binding;
    }

    addType(typeName) {
        if (!validateType(name)) throw ('Wrong type provided.');
        if (!this.typesOrder.find(type => type === typeName)) {
            this.typesOrder.push(typeName);
        }
    }

    addDataType(data_type, update, life) {
        this.addType(data_type.type);
        data[data_type.name] = {
            value: data_type,
            update,
            life
        }
    }

    getDataDefinition({ value, update, life }) {
        const rest = this.typesOrder.reduce((prev, curr) => prev + curr == value.type ? value.value : DEFAULT_VALUES[curr], '');
        return `Data(${update}, ${life}, block.number, ${rest});`;
    }

    getStruct() {
        const openStruct = `
struct Data {
    uint update_time;
    uint life_time;
    uint last_update;
`
        const types = this.typesOrder.reduce((prev, curr) => prev + `${curr} ${getTypeBinding(curr)};` + '\n', '\n');
        const close = '}\n';
        return `${openStruct}${types}${close}`;
    }

    getConstructorInserts() {
        return Object
            .entries(this.data)
            .map((name, dt) => `${this.binding}[${name}] = ${getDataDefinition(dt)};` + '\n')
            .reduce((curr, prev) => prev + '        ' + curr + '\n', '\n');
    }
}

export const getContractBase = (name, inputs) => {
    const imports = getMasterContract();
    const binding = 'data_vals';
    const data = Data(binding);
    inputs.map(inp => data.addDataType(new DataType(inp)));


    return `pragma solidity ^0.4.24;
${imports}

contract ${name} {
    address data_provider;
    address data_publisher;
    ${data.getStruct()}
    mapping(string => Data) ${binding};

    constructor(address master_oracle, address data_pub) {
        data_provider = master_oracle;
        data_publisher = data_pub;
        ${data.getConstructorInserts()}
    }

    modifier onlyDataPublisher() {
        require(data_publisher == msg.sender);
        _;
    }

    modifier nonEmptyLife(string name) {
        require(${binding}[name].life_time != 0);
        _;
    }

    modifier dataAntique(string name) {
        require(block.number > ${binding}[name].last_update + ${binding}[name].life_time);
        _;
    }

    modifier dataFresh(string name) {
        require(block.number < ${binding}[name].last_update + ${binding}[name].life_time);
        _;
    }

    modifier dataNeedRefresh(string name) {
        require(block.number > ${binding}[name].last_update + ${binding}[name].update_time);
        _;
    }

    /**
     * Check data age:
     * returns true, if data is valid;
     * returns false, if data needs to be updated;
     * throws error, if data is outdated (manual update call needed).
     */
    function check_data_age(string name) dataFresh(name) view private returns(bool) {
        return block.number < (${binding}[name].last_update + ${binding}[name].update_time);
    }

    function push_data_str(string name, string s_value) onlyDataPublisher public {
        ${binding}[name].last_update = block.number;
        ${binding}[name].s_value = s_value;
    }

    function push_data(string name, int value) onlyDataPublisher public {
        data_vals[name].last_update = block.number;
        data_vals[name].value = value;
    }

    function push_data_price(string name, uint value, uint decimals) onlyDataPublisher public {
        data_vals[name].last_update = block.number;
        data_vals[name].u_value = value;
        data_vals[name].decimals = decimals;
    }

    function push_data_uint(string name, uint value) onlyDataPublisher public {
        data_vals[name].last_update = block.number;
        data_vals[name].uvalue = value;
    }

    function request_data_manually(string name) nonEmptyLife(name) dataAntique(name) public {
        MasterOracle master = MasterOracle(data_provider);
        master.request_data(name, this);
    }

    function request_data(string name) nonEmptyLife(name) dataNeedRefresh(name) private {
        MasterOracle master = MasterOracle(data_provider);
        master.request_data(name, this);
    }
}`
}