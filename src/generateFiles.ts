import chalk from 'chalk';

import { TypeModifiedFiles, TypeGeneratorPlugin, TypeGenerateFilesParams } from './types';
import { logsPrefix } from './const';
import { getTimeDelta } from './utils/getTimeDelta';
import * as pluginTheme from './plugins/theme';
import * as pluginReexport from './plugins/reexport';
import * as pluginValidators from './plugins/validators';
import * as pluginReexportModular from './plugins/reexport-modular';

type TypePluginName = TypeGenerateFilesParams['configs'][number]['plugin'];

const pluginMapper: Record<TypePluginName, TypeGeneratorPlugin<any>> = {
  [pluginTheme.pluginName]: pluginTheme.generateTheme,
  [pluginReexport.pluginName]: pluginReexport.generateReexport,
  [pluginValidators.pluginName]: pluginValidators.generateValidators,
  [pluginReexportModular.pluginName]: pluginReexportModular.generateReexportModular,
};

function withMeasure({
  logs,
  plugin,
  callback,
}: {
  logs?: boolean;
  plugin: TypePluginName;
  callback: () => void;
}) {
  // eslint-disable-next-line no-console
  if (logs) console.time(plugin);

  callback();

  // eslint-disable-next-line no-console
  if (logs) console.timeEnd(plugin);
}

function applyModifications({
  configs,
  timeLogs,
  changedFiles,
  fileModificationLogs,
}: Omit<TypeGenerateFilesParams, 'timeLogsOverall'>) {
  let modifiedFiles: TypeModifiedFiles = [];

  configs.forEach(({ plugin, config }) => {
    withMeasure({
      logs: timeLogs,
      plugin,
      callback: () => {
        modifiedFiles = modifiedFiles.concat(
          pluginMapper[plugin]({ config, changedFiles, logs: fileModificationLogs })
        );
      },
    });
  });

  // uniq
  modifiedFiles = modifiedFiles.filter((value, index) => modifiedFiles.indexOf(value) === index);

  if (modifiedFiles.length) {
    applyModifications({
      configs,
      timeLogs,
      changedFiles: modifiedFiles,
      fileModificationLogs,
    });
  }
}

export const generateFiles = ({
  configs,
  timeLogs,
  changedFiles,
  timeLogsOverall,
  fileModificationLogs,
}: TypeGenerateFilesParams) => {
  const startTime = Date.now();

  applyModifications({
    configs,
    timeLogs,
    changedFiles,
    fileModificationLogs,
  });

  const endTime = getTimeDelta(startTime, Date.now());

  // eslint-disable-next-line no-console
  if (timeLogsOverall) console.log(`${logsPrefix} finished in ${chalk.yellow(endTime)} seconds`);
};
