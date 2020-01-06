import {excludeKeys} from 'utils';

test('excludeKeys should exclude object keys correctly', () => {
  expect(excludeKeys({foo: 'bar', extra: 'key', other: 'prop'}, ['extra'])).toEqual({
    foo: 'bar',
    other: 'prop'
  });
});
