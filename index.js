#!/usr/bin/env node

const fs = require('fs');
const { program } = require('commander');
const { default: inquirer } = require('inquirer');
const csv = require('fast-csv');
const chalk = require('chalk');
const stringSimilarity = require('string-similarity');

program
  .version('1.0.0')
  .description('A CSV processing utility');

program
  .command('filter')
  .description('Filter a CSV file')
  .action(async () => {
    const { inputFile } = await inquirer.prompt([
      {
        type: 'input',
        name: 'inputFile',
        message: 'Enter the path to the input CSV file:',
        default: 'data/bigbasket_products.csv',
      },
    ]);

    const headers = await new Promise((resolve, reject) => {
      const stream = fs.createReadStream(inputFile)
        .pipe(csv.parse({ headers: true }))
        .on('headers', (hdrs) => {
          stream.destroy();
          resolve(hdrs);
        })
        .on('error', (err) => reject(err));
    });

    const { column } = await inquirer.prompt([
      {
        type: 'list',
        name: 'column',
        message: 'Select a column to filter by:',
        choices: headers,
        loop: false,
      },
    ]);

    const valueCounts = await new Promise((resolve, reject) => {
      const counts = {};
      fs.createReadStream(inputFile)
        .pipe(csv.parse({ headers: true }))
        .on('data', (row) => {
          const value = row[column];
          if (value) {
            counts[value] = (counts[value] || 0) + 1;
          }
        })
        .on('end', () => resolve(counts))
        .on('error', (err) => reject(err));
    });

    const choices = Object.entries(valueCounts).map(([name, count]) => ({
      name: `${name} (${count} rows)`,
      value: name,
    }));

    const { selectedValues } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedValues',
        message: `Select values from the "${column}" column to filter by:`,
        choices: choices,
        loop: false,
      },
    ]);
console.log(`\nYou have selected the following values from the "${column}" column:`);
    selectedValues.forEach(value => console.log(`- ${value}`));
    console.log('\n');

    const { outputFile } = await inquirer.prompt([
      {
        type: 'input',
        name: 'outputFile',
        message: 'Enter the path to the output CSV file:',
        default: 'products_groceries.csv',
      },
    ]);

    const rows = [];
    fs.createReadStream(inputFile)
      .pipe(csv.parse({ headers: true }))
      .on('error', error => console.error(error))
      .on('data', (row) => {
        if (selectedValues.includes(row[column])) {
          rows.push(row);
        }
      })
      .on('end', (rowCount) => {
        console.log(`Parsed ${rowCount} rows`);
        csv.writeToPath(outputFile, rows, { headers: true })
          .on('error', err => console.error(err))
          .on('finish', () => console.log(`Filtered data (${rows.length} rows) written to ${outputFile}`));
      });
  });

const CsvQuery = require('./fluent');

program
  .command('query')
  .description('Filter a CSV file using a fluent API')
  .action(async () => {
    await new CsvQuery()
      .from('data/bigbasket_products.csv')
      .filter()
      .column('category')
      .valuesIn(["Beverages", "Eggs, Meat & Fish", "Foodgrains, Oil & Masala", "Fruits & Vegetables"])
      .to('products_groceries_fluent.csv');
  });
program
  .command('transform')
  .description('Transform a CSV file to another format')
  .action(async () => {
    const { inputFile } = await inquirer.prompt([
      {
        type: 'input',
        name: 'inputFile',
        message: 'Enter the path to the input CSV file:',
        default: 'data/bigbasket_products.csv',
      },
    ]);

    const { targetFormat } = await inquirer.prompt([
        {
            type: 'list',
            name: 'targetFormat',
            message: 'Select the target format:',
            choices: ['JSON', 'XML', 'YAML'],
            loop: false,
        }
    ]);

    if (targetFormat === 'JSON') {
        const { schemaFile } = await inquirer.prompt([
            {
                type: 'input',
                name: 'schemaFile',
                message: 'Enter the path to the JSON schema file:',
            }
        ]);

        if (!fs.existsSync(schemaFile)) {
            console.error('Schema file not found!');
            return;
        }

        const headers = await new Promise((resolve, reject) => {
          const stream = fs.createReadStream(inputFile)
            .pipe(csv.parse({ headers: true }))
            .on('headers', async (hdrs) => {
              stream.destroy();
              const finalHeaders = [];
              for (const header of hdrs) {
                if (header === '') {
                  const { newHeader } = await inquirer.prompt([
                    {
                      type: 'input',
                      name: 'newHeader',
                      message: 'An unnamed column was found. Please provide a name for it:',
                      default: 'index',
                    }
                  ]);
                  finalHeaders.push(newHeader);
                } else {
                  finalHeaders.push(header);
                }
              }
              resolve(finalHeaders);
            })
            .on('error', (err) => reject(err));
        });

        const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf-8'));
        const schemaFields = Object.keys(schema.items.properties);

        let mapping = {};
        let confirmed = false;

        while(!confirmed) {
            mapping = {};
            const { similarityThreshold } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'similarityThreshold',
                    message: 'Enter the similarity threshold for auto-mapping (0.0 to 1.0):',
                    default: 0.4,
                    validate: (value) => {
                        const num = parseFloat(value);
                        if (isNaN(num) || num < 0 || num > 1) {
                            return 'Please enter a number between 0.0 and 1.0';
                        }
                        return true;
                    }
                }
            ]);

            for (const field of schemaFields) {
                const { bestMatch } = stringSimilarity.findBestMatch(field, headers);
                
                const { csvColumn } = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'csvColumn',
                        message: `Which CSV column should map to the "${field}" field?`,
                        choices: ['(skip)', ...headers],
                        default: bestMatch.rating > similarityThreshold ? bestMatch.target : null,
                        loop: false,
                    }
                ]);
                if (csvColumn === '(skip)') {
                    mapping[field] = null;
                } else {
                    mapping[field] = csvColumn;
                }
            }

            console.log('\n--- Mapping Summary ---');
            console.log('Target Field (JSON)  ->  Source Field (CSV)');
            console.log('------------------------------------------');
            for(const field in mapping) {
                const source = mapping[field];
                const sourceDisplay = source === null ? chalk.gray('null') : chalk.yellow(source);
                console.log(`${chalk.cyan(field.padEnd(22))}->  ${sourceDisplay}`);
            }
            console.log('------------------------------------------\n');

            const { confirmMapping } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirmMapping',
                    message: 'Is this mapping correct?',
                    default: true,
                }
            ]);
            confirmed = confirmMapping;
        }

        const { outputFile } = await inquirer.prompt([
          {
            type: 'input',
            name: 'outputFile',
            message: 'Enter the path to the output JSON file:',
            default: 'output.json',
          },
        ]);

        const results = [];
        fs.createReadStream(inputFile)
          .pipe(csv.parse({ headers: headers, renameHeaders: true }))
          .on('data', (row) => {
            const transformedRow = {};
            for (const field of schemaFields) {
              const mappedColumn = mapping[field];
              if (mappedColumn === null) {
                transformedRow[field] = null;
              } else {
                transformedRow[field] = row[mappedColumn] !== undefined ? row[mappedColumn] : null;
              }
            }
            results.push(transformedRow);
          })
          .on('end', (rowCount) => {
            fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
            console.log(`\nSuccessfully transformed ${rowCount} rows and saved to ${outputFile}`);
          })
          .on('error', (error) => console.error(error));
    }
  });
program.parse(process.argv);