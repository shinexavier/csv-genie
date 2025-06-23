#!/usr/bin/env node

const fs = require('fs');
const { program } = require('commander');
const { default: inquirer } = require('inquirer');
const csv = require('fast-csv');

program
  .version('1.0.0')
  .description('A CSV filtering utility');

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
          .on('finish', () => console.log(`Filtered data written to ${outputFile}`));
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
program.parse(process.argv);