/**
 * Excludes keys from the object
 * returns a new object
 * @param source
 * @param keys
 */
export function excludeKeys(source: {[key: string]: any}, keys: string[]) {
  const copy: {[key: string]: any} = {};
  Object.keys(source).forEach(key => {
    if (!keys.includes(key)) copy[key] = source[key];
  });
  return copy;
}

export function validateConfig(config: {[key: string]: any}, requiredProps: string[]) {
  requiredProps.forEach(prop => {
    if (config[prop] === undefined || config[prop] === null) {
      throw new Error(`Required config "${prop}" is missing!`)
    }
  })
}
