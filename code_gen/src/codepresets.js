import {
    PUSH_CONSTRUCTION,
    VALID_TYPES,
    DEFAULT_VALUES,
    PRICE_DEFINITION,
    TIMING_DEFINITION,
    MASTER_CONTRACT_DEFINITION
} from "./consts";

export const getMasterContract = () => {
    return MASTER_CONTRACT_DEFINITION;
}

export const getPushFunction = (binding, type) => {
    const { inputs, value } = PUSH_CONSTRUCTION[type];
    return `
    function push_data_${type}(string name, ${inputs}) onlyDataPublisher public {
        ${binding}[name].last_update = block.number;
        ${getTypeBinding(type)}[name] = ${value};
    }`
}

export const getGetter = (name, hash, type) => {
    return `function get${name}() dataFresh("${hash}") public returns (${PUSH_CONSTRUCTION[type].rettype || type}) {
        if (!check_data_age("${hash}")) {
            request_data("${hash}");
        }
        return ${getTypeBinding(type)}["${hash}"]${PUSH_CONSTRUCTION[type].getter || ''};
    }`
}

class DataType {
    constructor({ name, hash, life, update, type, value, decimals = 0 }) {
        this.name = name;
        this.hash = hash;
        this.life = life;
        this.update = update;
        this.type = type;
        if (type == 'price') this.value = `${PUSH_CONSTRUCTION[type].in_code}(${value}, ${decimals})`;
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
        this.data[data_type.hash] = {
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
        let openStruct = TIMING_DEFINITION;
        if (this.types.includes('price')) openStruct += PRICE_DEFINITION;
        const types = this.types.reduce((prev, curr) => prev + `\n    mapping(string => ${PUSH_CONSTRUCTION[curr].in_code || curr}) ${getTypeBinding(curr)};`, '');
        return `${openStruct}${types}`;
    }

    getConstructorInserts() {
        return Object
            .entries(this.data)
            .map(([hash, dt]) => this.getDataDefinition(hash, dt))
            .reduce((prev, curr) => prev + '\n        ' + curr);
    }

    getGetters() {
        return Object
            .entries(this.data)
            .map(([hash, dt]) => getGetter(dt.value.name, hash, dt.value.type))
            .reduce((prev, curr) => prev + '\n\n    ' + curr);
    }

    getPushFunctions() {
        return Object
            .entries(this.data)
            .map(([_, dt]) => getPushFunction(this.binding, dt.value.type))
            .reduce((prev, curr) => prev + '\n    ' + curr);
    }
}

export const getContractBase = (name, inputs) => {
    const imports = getMasterContract();
    const binding = 'data_timings';
    const data = new Data(binding);
    inputs.forEach(inp => {
        if (!inp.update || !inp.life || !inp.hash) throw ('Not specified hash, life or update time for ' + inp.name);
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