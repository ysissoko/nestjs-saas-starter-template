import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import * as tsConfigPaths from 'tsconfig-paths';
import { DataSource, DataSourceOptions } from 'typeorm';

// Register path aliases for TypeORM migrations
const baseUrl = path.join(__dirname, '../../');
const tsConfig = JSON.parse(
  fs.readFileSync(path.join(baseUrl, 'tsconfig.json'), 'utf8'),
);

// Register TS path aliases
tsConfigPaths.register({
  baseUrl,
  paths: tsConfig.compilerOptions.paths || {},
});

// Load config file
const configPath = path.resolve(__dirname, '../../config/config.yaml');
const configFile = fs.readFileSync(configPath, 'utf8');
const config = yaml.load(configFile) as Record<string, any>;

// Extract database configuration
const dbConfig = config['app'].database as DataSourceOptions;

// Configure entities and migrations paths for CLI usage
export const dataSourceOptions: DataSourceOptions = {
  ...dbConfig,
  entities: [
    path.join(__dirname, '/**/*.entity{.ts,.js}'),
    path.join(__dirname, '../../libs/common/src/**/*.entity{.ts,.js}'),
  ],
  migrations: [path.join(__dirname, '/database/migrations/**/*{.ts,.js}')],
};

// Create and export the data source
export const AppDataSource = new DataSource(dataSourceOptions);
