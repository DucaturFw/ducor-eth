export const DEFAULT_VALUES = { 'uint': 0, 'int': 0, 'string': '', 'price': 'Price(0, 0)' };
export const PUSH_CONSTRUCTION = {
    'price': {
        'inputs': 'uint value, uint8 decimals',
        'value': 'Price(value, decimals)'
    },
    'string': {
        'inputs': 'string value',
        'value': 'value'
    },
    'uint': {
        'inputs': 'uint value',
        'value': 'value'
    },
    'int': {
        'inputs': 'int value',
        'value': 'value'
    },
};
export const VALID_TYPES = Object.keys(PUSH_CONSTRUCTION);

export const PRICE_DEFINITION = `
    struct Price {
        uint value;
        uint8 decimals;
    }`;
export const TIMING_DEFINITION = `
    struct Data {
        uint update_time;
        uint life_time;
        uint last_update;
    }`;