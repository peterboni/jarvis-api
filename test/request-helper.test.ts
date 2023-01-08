import { validateAlphanumeric } from '../src/request-helper';

/*
 * validateAlphanumeric
 */
test('validateAlphaNumeric valid', () => {
    const test = validateAlphanumeric('majorThing', true, 'home');
    expect(test.valid).toBe(true);
});
test('validateAlphaNumeric value required', () => {
    const test = validateAlphanumeric('majorThing', true);
    expect(test.valid).toBe(false);
});
test('validateAlphaNumeric value required invalid', () => {
    const test = validateAlphanumeric('majorThing', true, 'home;');
    expect(test.valid).toBe(false);
});
test('validateAlphaNumeric value optional invalid', () => {
    const test = validateAlphanumeric('majorThing', false, 'home;');
    expect(test.valid).toBe(false);
});
