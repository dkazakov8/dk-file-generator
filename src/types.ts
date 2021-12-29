import { TypeProcessParamsTheme, TypePluginNameTheme } from './plugins/theme/types';
import { TypeProcessParamsReexport, TypePluginNameReexport } from './plugins/reexport/types';
import { TypeProcessParamsValidators, TypePluginNameValidators } from './plugins/validators/types';
import {
  TypeProcessParamsReexportModular,
  TypePluginNameReexportModular,
} from './plugins/reexport-modular/types';

export type TypeFilePath = string;

export type TypeFolderPath = string;

export type TypeModifiedFiles = Array<string>;

export type TypeGeneratorPlugin<TParams> = (params: TParams) => TypeModifiedFiles;

export type TypeGeneratorPluginData =
  | { plugin: TypePluginNameTheme; config: TypeProcessParamsTheme['config'] }
  | { plugin: TypePluginNameReexport; config: TypeProcessParamsReexport['config'] }
  | { plugin: TypePluginNameValidators; config: TypeProcessParamsValidators['config'] }
  | { plugin: TypePluginNameReexportModular; config: TypeProcessParamsReexportModular['config'] };

export type TypeGenerateFilesParams = {
  configs: Array<TypeGeneratorPluginData>;

  timeLogs?: boolean;
  changedFiles?: Array<string>;
  timeLogsOverall?: boolean;
  fileModificationLogs?: boolean;
};
