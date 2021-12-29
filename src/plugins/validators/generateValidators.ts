import fs from 'fs';
import path from 'path';

import chalk from 'chalk';

import { saveFile } from '../../utils/saveFile';
import { logsPrefix } from '../../const';
import { getFilteredChildren } from '../../utils/getFilteredChildren';
import { checkFilesExistence } from '../../utils/checkFilesExistence';
import { TypeGeneratorPlugin, TypeModifiedFiles } from '../../types';
import { Compiler } from '../../../ts-interface-builder';

import { removeDuplicatedDeclarations } from './removeDuplicatedDeclarations';
import { TypeProcessParamsValidators } from './types';

export const pluginName = 'validators';

const logsPrefixWithPlugin = `${logsPrefix} ${chalk.yellow(`[${pluginName}]`)}`;

export const generateValidators: TypeGeneratorPlugin<TypeProcessParamsValidators> = (params) => {
  const { changedFiles, logs } = params;

  /**
   * Filter config by shallow match (includes) in changedFiles
   * because we need to watch folders' children
   *
   * also may be needed to include some triggerPath where models are located
   *
   */

  const config = changedFiles
    ? params.config.filter(({ folder, triggerFolder, includeChildrenMask }) =>
        changedFiles.some((filePath) => {
          const fileName = path.parse(filePath).base;
          const includedInFilePath = filePath.includes(folder);

          if (includeChildrenMask) {
            const includedByMask = includeChildrenMask.test(fileName);

            if (!triggerFolder) return includedInFilePath && includedByMask;

            return (includedInFilePath && includedByMask) || filePath.includes(triggerFolder);
          }

          if (!triggerFolder) return includedInFilePath;

          return includedInFilePath || filePath.includes(triggerFolder);
        })
      )
    : params.config;

  if (!config.length) return [];

  checkFilesExistence({ paths: config.map(({ folder }) => folder) });

  const modifiedFiles: TypeModifiedFiles = [];

  config.forEach(
    ({ folder, targetFolder, compilerOptions, includeChildrenMask, headerTemplate }) => {
      const { paths: childrenPaths, names: childrenNames } = getFilteredChildren({
        folder,
        include: includeChildrenMask,
      });

      const compilerResults = Compiler.compile(childrenPaths, compilerOptions);

      compilerResults.result.forEach((result) => {
        let content = headerTemplate || '';
        content += removeDuplicatedDeclarations(result.content);

        const filePath = path.resolve(targetFolder, path.parse(result.filePath).base);

        const validatorOverwritten = saveFile({ content, filePath });

        if (validatorOverwritten) {
          modifiedFiles.push(filePath);

          if (logs) {
            // eslint-disable-next-line no-console
            console.log(`${logsPrefixWithPlugin} created ${filePath.replace(process.cwd(), '')}`);
          }
        }
      });

      /**
       * Remove not used validators
       *
       */

      const targetChildren = getFilteredChildren({
        folder: targetFolder,
        include: includeChildrenMask,
      });

      targetChildren.names.forEach((targetChildName, index) => {
        if (childrenNames.includes(targetChildName)) return;

        const targetChildPath = targetChildren.paths[index];

        fs.unlinkSync(targetChildPath);

        modifiedFiles.push(targetChildPath);

        if (logs) {
          // eslint-disable-next-line no-console
          console.log(
            `${logsPrefixWithPlugin} removed ${targetChildPath.replace(process.cwd(), '')}`
          );
        }
      });
    }
  );

  return modifiedFiles;
};
