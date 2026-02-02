import { execSync } from 'child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import * as yaml from 'js-yaml';
import { join, resolve } from 'path';

const YAML_CONFIG_FILENAME = 'config-submodules.yaml';

// Function to check if a submodule exists in .gitmodules
function isSubmoduleInGitmodules(submodulePath) {
  const gitmodulesPath = join(process.cwd(), '.gitmodules');

  // Check if the .gitmodules file exists
  if (!existsSync(gitmodulesPath)) {
    console.log('.gitmodules file does not exist.');
    return false;
  }

  const gitmodulesContent = readFileSync(gitmodulesPath, 'utf-8');

  // Look for the submodule's path in the .gitmodules file
  const submoduleRegex = new RegExp(`path = ${submodulePath}`, 'g');

  return submoduleRegex.test(gitmodulesContent);
}

function isServiceAdded(submoduleDir) {
  try {
    execSync(`git ls-files --error-unmatch ${submoduleDir}`, {
      stdio: 'ignore',
    });
    return true;
  } catch (err) {
    // not tracked, continue to add submodule
    return false;
  }
}

function copyControllerFile(serviceName, controllerFilename) {
  // New: set destination directory and file path
  const destDir = join(process.cwd(), 'backend/src/controllers');
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  const destFile = join(destDir, controllerFilename);
  copyFileSync(
    join(process.cwd(), `apps/${serviceName}/gateway.controller`),
    destFile,
  );
}

/**
 * Add a script to package.json
 * @param {string} scriptName - The name of the script
 * @param {string} scriptCommand - The command to execute
 * @param {string} [packagePath='./package.json'] - Path to package.json
 */
function addScriptsToPackageJson(scripts, packagePath = './package.json') {
  // Resolve the absolute path
  const absPath = resolve(packagePath);

  // Read the package.json file
  const packageJson = JSON.parse(readFileSync(absPath, 'utf8'));

  // Initialize scripts object if it doesn't exist
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }

  scripts.forEach(({ name, command }) => {
    // Add or update the script
    packageJson.scripts[name] = command;
  });

  // Write the updated JSON back to the file with proper formatting
  writeFileSync(absPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');

  console.log(`Added scripts to package.json`);
}

function addProjectToNestCli(name, config, nestCliPath = './nest-cli.json') {
  // Resolve the absolute path
  const absPath = resolve(nestCliPath);

  // Read the package.json file
  const nestCliJson = JSON.parse(readFileSync(absPath, 'utf8'));

  // Initialize scripts object if it doesn't exist
  if (!nestCliJson.scripts) {
    nestCliJson.scripts = {};
  }

  nestCliJson.projects[name] = config;

  // Write the updated JSON back to the file with proper formatting
  writeFileSync(absPath, JSON.stringify(nestCliJson, null, 2) + '\n', 'utf8');

  console.log(`Added projects added to nest-cli.json`);
}

const genAppConfig = (name) => ({
  type: 'application',
  root: `apps/${name}`,
  entryFile: 'main',
  sourceRoot: `apps/${name}/src`,
  compilerOptions: {
    tsConfigPath: `apps/${name}/tsconfig.app.json`,
  },
});

export default function (plop) {
  const { services } = yaml.load(
    readFileSync(join(process.cwd(), 'config', YAML_CONFIG_FILENAME), 'utf8'),
  );

  plop.setActionType('addScripts', function (answers, config, plop) {
    const { scripts } = config.service;
    addScriptsToPackageJson(scripts);
  });

  plop.setActionType('addProject', function (answers, config, plop) {
    const { name } = config.service;
    addProjectToNestCli(name, genAppConfig(name));
  });

  plop.setActionType('addSubmodule', async function (data, config) {
    const { name, repo, controller } = config.service;
    return new Promise((resolve, reject) => {
      try {
        if (!existsSync('.gitmodules'))
          writeFileSync(join(process.cwd(), '.gitmodules'), '');

        const submoduleDir = `apps/${name}`;

        // New: Check if the submodule directory is tracked by git
        if (isServiceAdded(submoduleDir)) {
          const msg = `The service ${name} directory already exists in the index.`;
          console.warn(msg);
          return resolve(msg);
        }

        if (!isSubmoduleInGitmodules(repo)) {
          const result = execSync(`git submodule add ${repo} ${submoduleDir}`);
          // Copy the related controller file
          copyControllerFile(name, controller.fileName);
          resolve(result.toString());
        } else {
          const msg = `The service ${name} is already added`;
          console.warn(msg);
          resolve(msg);
        }
      } catch (error) {
        reject(error);
      }
    });
  });

  plop.setGenerator('initServices', {
    description: 'Add a new microservice to the workspace',
    prompts: [
      {
        type: 'checkbox',
        name: 'selectedServices',
        message: 'Which services you want to add to your hub?',
        // the choices are the name of the services
        choices: services.map(({ name, label }) => ({
          name: label,
          value: name,
          disabled: isServiceAdded(`apps/${name}`),
        })),
      },
    ],
    actions: function ({ selectedServices }) {
      const actions = [];

      services
        .filter(({ name }) => selectedServices.includes(name))
        .forEach((service) => {
          actions.push({
            type: 'addSubmodule',
            service,
          });

          actions.push({
            type: 'addScripts',
            service,
          });

          actions.push({
            type: 'addProject',
            service,
          });

          const { controller, name } = service;
          actions.push({
            type: 'append',
            path: 'backend/src/gateway.module.ts',
            pattern: '// DO NOT REMOVE: IMPORT CONTROLLER',
            template: `import { ${
              controller.className
            } } from "./controllers/${controller.fileName.replace('.ts', '')}"`,
          });

          actions.push({
            type: 'append',
            path: 'backend/src/gateway.module.ts',
            pattern: '// DO NOT REMOVE: ADD IN REGISTRY',
            template: `'${name}': [${controller.className}], `,
          });
        });

      return actions;
    },
  });

  // create your generators here
  plop.setGenerator('full-module', {
    description:
      'Skeleton of module using base class for controller, service and entity',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Enter module name:',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'backend/src/modules/{{kebabCase name}}/{{kebabCase name}}.module.ts',
        templateFile: 'plop-templates/module.hbs',
      },
      {
        type: 'add',
        path: 'backend/src/modules/{{kebabCase name}}/{{kebabCase name}}.controller.ts',
        templateFile: 'plop-templates/controller.hbs',
      },
      {
        type: 'add',
        path: 'backend/src/modules/{{kebabCase name}}/{{kebabCase name}}.controller.spec.ts',
        templateFile: 'plop-templates/controller-spec.hbs',
      },
      {
        type: 'add',
        path: 'backend/src/modules/{{kebabCase name}}/{{kebabCase name}}.service.ts',
        templateFile: 'plop-templates/service.hbs',
      },
      {
        type: 'add',
        path: 'backend/src/modules/{{kebabCase name}}/{{kebabCase name}}.service.spec.ts',
        templateFile: 'plop-templates/service-spec.hbs',
      },
      {
        type: 'add',
        path: 'backend/src/entities/{{kebabCase name}}.entity.ts',
        templateFile: 'plop-templates/entity.hbs',
      },
      {
        type: 'append',
        pattern: 'IMPORT MODULES',
        path: 'backend/src/gateway.module.ts',
        template:
          "import { {{pascalCase name}}Module } from './modules/{{ kebabCase name }}/{{ kebabCase name }}.module';",
      },
      {
        type: 'append',
        pattern: 'ADD MODULE',
        template: '				{{ pascalCase name }}Module,',
        path: 'backend/src/gateway.module.ts',
      },
      {
        type: 'append',
        pattern: 'ADD ENTITY',
        template: "export * from './{{ kebabCase name }}.entity'",
        path: 'backend/src/entities/index.ts',
      },
    ], // array of actions
  });
}
