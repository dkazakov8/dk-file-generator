/**
 * @docs: https://github.com/paulmillr/chokidar
 *
 */

import fs from 'fs';

import chokidar from 'chokidar';
import chalk from 'chalk';

import { logsPrefix } from './const';
import { generateFiles } from './generateFiles';
import { TypeGenerateFilesWatchParams } from './types';

const watchLogsPrefix = `${logsPrefix} ${chalk.yellow('[watch]')}`;

export function generateFilesOnChange(options: TypeGenerateFilesWatchParams) {
  const {
    paths,
    configs,
    onStart,
    timeLogs,
    onFinish,
    timeLogsOverall,
    changedFilesLogs,
    aggregationTimeout,
    fileModificationLogs,
  } = options;

  let changedFilesLogsData: Array<{ type: string; filePath: string; mtime?: fs.Stats['mtimeMs'] }> =
    [];
  let watchDebounceTimeout: NodeJS.Timeout;
  let watcher = chokidar.watch(paths, { ignoreInitial: true });

  const handlerAdd = fileChanged('add');
  const handlerChange = fileChanged('change');
  const handlerUnlink = fileChanged('unlink');

  function addWatchers() {
    watcher.on('add', handlerAdd).on('change', handlerChange).on('unlink', handlerUnlink);
  }

  function fileChanged(type: string) {
    return (filePath: string, stats?: fs.Stats) => {
      if (changedFilesLogs) {
        changedFilesLogsData.push({ type, filePath, mtime: stats?.mtimeMs });
      }

      clearTimeout(watchDebounceTimeout);
      watchDebounceTimeout = setTimeout(() => {
        let changedFiles = changedFilesLogsData.map((params) => params.filePath);
        changedFiles = changedFiles.filter((value, index) => changedFiles.indexOf(value) === index);

        if (changedFilesLogs) {
          const formattedLogs = changedFilesLogsData
            .map((params) => {
              const shortFilePath = params.filePath.replace(process.cwd(), '');

              return `${chalk.blue(`[${params.type}]`)} ${
                params.mtime ? chalk.grey(`[${params.mtime}] `) : ''
              }${shortFilePath}`;
            })
            .join('\n');

          // eslint-disable-next-line no-console
          console.log(`${watchLogsPrefix} triggered by\n${formattedLogs}`);
        }

        void watcher.close().then(() => {
          onStart?.();

          generateFiles({
            configs,
            timeLogs,
            changedFiles,
            timeLogsOverall,
            fileModificationLogs,
          });

          changedFilesLogsData = [];

          watcher = chokidar.watch(paths, { ignoreInitial: true });
          addWatchers();

          onFinish?.();
        });
      }, aggregationTimeout || 0);
    };
  }

  addWatchers();
}
