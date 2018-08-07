const preset = require('../src/codepresets');
const example_contract = require('./example_contract');

describe('MultiDataConstructor', () => {
    test('should create similar contract', () => {
        const created = preset.getContractBase('test_contract', [{ hash: 'alh', name: 'Aloha', value: 100, type: 'uint', life: 10, update: 2 }]);
        expect(created).toEqual(example_contract.EXAMPLE_CONTRACT);
    })
})