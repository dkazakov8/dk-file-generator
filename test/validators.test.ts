import path from 'path';
import fs from 'fs';

import { expect } from 'chai';
import fsExtra from 'fs-extra';

import { fileEncoding } from '../src/const';
import { generateValidators } from '../src/plugins/validators';
import { getFilteredChildren } from '../src/utils/getFilteredChildren';

const defaultGetUserContent = `import * as t from "ts-interface-checker";
// tslint:disable:object-literal-key-quotes

export const TypeRole = t.union(t.lit('manager'), t.lit('admin'));

export const TypeUser = t.iface([], {
  "email": "string",
  "name": "string",
  "role": "TypeRole",
  "someData": t.array(t.tuple("number", "string")),
});

export const TypeRequest = t.iface([], {
});

export const TypeResponse = t.name("TypeUser");

const exportedTypeSuite: t.ITypeSuite = {
  TypeRole,
  TypeUser,
  TypeRequest,
  TypeResponse,
};
export default exportedTypeSuite;
`;

const defaultGetUserExtendedContent = `import * as t from "ts-interface-checker";
// tslint:disable:object-literal-key-quotes

export const TypeRole = t.union(t.lit('manager'), t.lit('admin'));

export const TypeUser = t.iface([], {
  "email": "string",
  "name": "string",
  "role": "TypeRole",
  "someData": t.array(t.tuple("number", "string")),
});

export const TypeUserExtended = t.intersection("TypeUser", t.iface([], {
  "role": "TypeRole",
  "gender": "string",
}));

export const TypeRequest = t.iface([], {
  "id": "string",
});

export const TypeResponse = t.name("TypeUserExtended");

const exportedTypeSuite: t.ITypeSuite = {
  TypeRole,
  TypeUser,
  TypeUserExtended,
  TypeRequest,
  TypeResponse,
};
export default exportedTypeSuite;
`;

describe('generate validators', () => {
  const folder = path.resolve(__dirname, 'tmp/validators/api');
  const targetFolder = path.resolve(__dirname, 'tmp/api');
  const triggerFolder = path.resolve(__dirname, 'tmp/validators/models');

  beforeEach(() => {
    fsExtra.copySync(
      path.resolve(__dirname, 'source/validators'),
      path.resolve(__dirname, 'tmp/validators')
    );
  });

  afterEach(() => {
    fsExtra.emptydirSync(path.resolve(__dirname, 'tmp'));
  });

  it('creates validators', () => {
    generateValidators({
      config: [{ folder, targetFolder, headerTemplate: '// some-comment\n\n' }],
      logs: true,
    });

    const fileNames = getFilteredChildren({ folder: targetFolder }).names;

    expect(fileNames).to.deep.equal(['getUser.ts', 'getUserExtended.ts']);

    const getUserContent = fs.readFileSync(path.resolve(targetFolder, 'getUser.ts'), fileEncoding);
    const getUserExtendedContent = fs.readFileSync(
      path.resolve(targetFolder, 'getUserExtended.ts'),
      fileEncoding
    );

    expect(getUserContent).to.equal(`// some-comment\n\n${defaultGetUserContent}`);
    expect(getUserExtendedContent).to.equal(`// some-comment\n\n${defaultGetUserExtendedContent}`);
  });

  it('creates validators when model changed', () => {
    generateValidators({ config: [{ folder, targetFolder }] });

    const fileNames = getFilteredChildren({ folder: targetFolder }).names;

    expect(fileNames).to.deep.equal(['getUser.ts', 'getUserExtended.ts']);

    const getUserContent = fs.readFileSync(path.resolve(targetFolder, 'getUser.ts'), fileEncoding);
    const getUserExtendedContent = fs.readFileSync(
      path.resolve(targetFolder, 'getUserExtended.ts'),
      fileEncoding
    );

    expect(getUserContent).to.equal(defaultGetUserContent);
    expect(getUserExtendedContent).to.equal(defaultGetUserExtendedContent);

    fs.writeFileSync(
      path.resolve(triggerFolder, 'TypeUser.ts'),
      `import { TypeRole } from './TypeRole';

export type TypeUser = {
  email: number;
  name: string;
  role: TypeRole;
  someData: Array<[number, string]>;
};
`,
      fileEncoding
    );

    generateValidators({ config: [{ folder, targetFolder }] });

    const getUserContent2 = fs.readFileSync(path.resolve(targetFolder, 'getUser.ts'), fileEncoding);

    expect(getUserContent2).to.equal(
      defaultGetUserContent.replace(`"email": "string",`, `"email": "number",`)
    );
  });

  it('removes not existing validators', () => {
    generateValidators({
      config: [{ folder, targetFolder }],
    });

    const fileNames = getFilteredChildren({ folder: targetFolder }).names;

    expect(fileNames).to.deep.equal(['getUser.ts', 'getUserExtended.ts']);

    generateValidators({
      config: [{ folder: path.resolve(__dirname, 'source/validators2/api'), targetFolder }],
      logs: true,
    });

    const fileNames2 = getFilteredChildren({ folder: targetFolder }).names;

    expect(fileNames2).to.deep.equal(['getUser.ts']);
  });

  it('creates validators when included in changedFiles', () => {
    generateValidators({
      config: [{ folder, targetFolder }],
      changedFiles: [path.resolve(folder, 'getUser.ts')],
    });

    const fileNames = getFilteredChildren({ folder: targetFolder }).names;

    expect(fileNames).to.deep.equal(['getUser.ts', 'getUserExtended.ts']);
  });

  it('creates validators when included in changedFiles (triggerFolder)', () => {
    generateValidators({
      config: [{ folder, targetFolder, triggerFolder }],
      changedFiles: [path.resolve(triggerFolder, 'TypeRole.ts')],
    });

    const fileNames = getFilteredChildren({ folder: targetFolder }).names;

    expect(fileNames).to.deep.equal(['getUser.ts', 'getUserExtended.ts']);
  });

  it('no validators when not included in changedFiles', () => {
    generateValidators({
      config: [{ folder, targetFolder }],
      changedFiles: [],
    });

    const targetFolderExists = fs.existsSync(targetFolder);

    expect(targetFolderExists).to.equal(false);
  });
});
