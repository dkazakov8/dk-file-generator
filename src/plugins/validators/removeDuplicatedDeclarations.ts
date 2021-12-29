// TEMP fix for https://github.com/gristlabs/ts-interface-builder/issues/14

export function removeDuplicatedDeclarations(str: string) {
  let finalStr = str;
  const found: Array<string> = [];

  // @ts-ignore
  str.match(/export const (\w+)[^;]+/g).forEach((matchedString) => {
    if (found.includes(matchedString)) {
      finalStr = finalStr.replace(`${matchedString};`, '');
    } else {
      found.push(matchedString);
    }
  });

  const exportRegex = /const exportedTypeSuite: t\.ITypeSuite = \{[^}]+/g;
  // @ts-ignore
  let arr = str.match(exportRegex)[0].split('\n');
  arr = arr.filter((item, index) => arr.indexOf(item) === index);

  finalStr = finalStr.replace(exportRegex, arr.join('\n'));
  finalStr = finalStr.replace(/\n\n\s/g, '\n');

  return finalStr;
}
