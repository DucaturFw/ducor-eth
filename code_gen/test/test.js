const preset = require('../src/codepresets');
const example_contract = require('./example_contract');

describe('MultiDataConstructor', () => {
    test('should create similar contract', () => {
        const created = preset.getContractBase(
            'test_contract', [
                { hash: 'alh', name: 'Aloha', value: 100, type: 'uint', life: 10, update: 2 },
                { hash: 'nih', name: 'Nihao', value: 12345, decimals: 2, type: 'price', life: 100, update: 5 },
            ]
        );
        expect(created).toEqual(example_contract.EXAMPLE_CONTRACT);
    })
})