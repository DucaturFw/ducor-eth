import { PUSH_CONSTRUCTION, VALID_TYPES, DEFAULT_VALUES } from "./consts";

const typeToValueBind = {
    'uint': 'u_value',
    'int': 'value',
    'string': 's_value'
}

export const getMasterContract = () => {
    return (`
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

contract MasterOracle is Ownable {
    event DataRequest(string name, address receiver);
    function request_data(string name, address receiver) public {
        emit DataRequest(name, receiver);
    }
}`);
}

export const getPushFunction = (binding, type) => {
    const { inputs, value } = PUSH_CONSTRUCTION[type];
    return `
    function push_data_${type}(string name, ${inputs}) onlyDataPublisher public {
        ${binding}[name].last_update = block.number;
        ${getTypeBinding(type)}[name] = ${value};
    }`
}

export const getGetter = (name, type) => {
    return `function get${name}() dataFresh("${name}") public returns (${type}) {
        if (!check_data_age("${name}")) {
            request_data("${name}");
        }
        return ${getTypeBinding(type)}["${name}"];
    }`
}

class DataType {
    constructor({ name, life, update, type, value, decimals = 0 }) {
        this.name = name;
        this.type = type;
        this.life = life;
        this.update = update;
        if (type == 'price') this.value = `Price(${value}, ${decimals})`;
        else this.value = value;
        this.decimals = decimals;
    }
}

const validateType = (type) => !!VALID_TYPES.find(t => t == type);
const getTypeBinding = (type) => type[0] + '_data';

class Data {
    constructor(binding = 'data_timing') {
        this.binding = binding;
        this.types = [];
        this.data = {};
    }

    addType(typeName) {
        if (!validateType(typeName)) throw ('Wrong type provided.');
        if (!this.types.find(type => type === typeName)) {
            this.types.push(typeName);
        }
    }

    addDataType(data_type, update, life) {
        this.addType(data_type.type);
        this.data[data_type.name] = {
            value: data_type,
            update,
            life
        }
    }

    getDataDefinition(name, { value, update, life }) {
        let timings = `${this.binding}["${name}"] = Data(${update}, ${life}, block.number);`;
        timings += `
        ${getTypeBinding(value.type)}["${name}"] = ${value.value ? value.value : DEFAULT_VALUES[curr]};`;
        return timings;
    }

    getStruct() {
        let openStruct = `
    struct Data {
        uint update_time;
        uint life_time;
        uint last_update;
    }`;
        if (this.types.includes('price')) openStruct += `
    struct Price {
        uint value;
        uint8 decimals;
    }`;
        const types = this.types.reduce((prev, curr) => prev + `\n    mapping(string => ${curr}) ${getTypeBinding(curr)};`, '');
        return `${openStruct}${types}`;
    }

    getConstructorInserts() {
        return Object
            .entries(this.data)
            .map(([name, dt]) => this.getDataDefinition(name, dt))
            .reduce((prev, curr) => prev + '\n' + curr);
    }

    getGetters() {
        return Object
            .entries(this.data)
            .map(([name, dt]) => getGetter(name, dt.value.type))
            .reduce((prev, curr) => prev + '\n' + curr);
    }

    getPushFunctions() {
        return Object
            .entries(this.data)
            .map(([_, dt]) => getPushFunction(this.binding, dt.value.type))
            .reduce((prev, curr) => prev + '\n' + curr);
    }
}

export const getContractBase = (name, inputs) => {
    const imports = getMasterContract();
    const binding = 'data_timings';
    const data = new Data(binding);
    inputs.forEach(inp => {
        if (!inp.update || !inp.life) throw ('Not specified life or update time for ' + inp.name);
        data.addDataType(new DataType(inp), inp.update, inp.life);
    });

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
    ${data.getPushFunctions()}

    function request_data_manually(string name) nonEmptyLife(name) dataAntique(name) public {
        MasterOracle master = MasterOracle(data_provider);
        master.request_data(name, this);
    }

    function request_data(string name) nonEmptyLife(name) dataNeedRefresh(name) private {
        MasterOracle master = MasterOracle(data_provider);
        master.request_data(name, this);
    }
    
    ${data.getGetters()}
}`.replace(/\x20+$/gm, "")
}