const fs = require('fs');
const csv = require('fast-csv');

const STATES = {
  CREATED: 'CREATED',
  HAS_SOURCE: 'HAS_SOURCE',
  FILTERING: 'FILTERING',
  HAS_COLUMN: 'HAS_COLUMN',
  HAS_FILTER: 'HAS_FILTER',
  EXECUTED: 'EXECUTED',
};

class CsvQuery {
  constructor() {
    this.filePath = null;
    this.filters = [];
    this.outputFilePath = null;
    this.state = STATES.CREATED;
  }

  _assertState(expectedState) {
    if (this.state !== expectedState) {
      throw new Error(`Invalid state: Expected ${expectedState}, but was ${this.state}. Please follow the chain: from -> filter -> column -> valuesIn -> to.`);
    }
  }

  from(filePath) {
    this._assertState(STATES.CREATED);
    this.filePath = filePath;
    this.state = STATES.HAS_SOURCE;
    return this;
  }

  filter() {
    if (this.state !== STATES.HAS_SOURCE && this.state !== STATES.HAS_FILTER) {
        throw new Error(`Invalid state: Expected ${STATES.HAS_SOURCE} or ${STATES.HAS_FILTER}, but was ${this.state}.`);
    }
    this.state = STATES.FILTERING;
    return this;
  }

  column(columnName) {
    this._assertState(STATES.FILTERING);
    this.currentColumn = columnName;
    this.state = STATES.HAS_COLUMN;
    return this;
  }

  valuesIn(values) {
    this._assertState(STATES.HAS_COLUMN);
    if (!this.currentColumn) {
      throw new Error('You must specify a column before specifying values.');
    }
    this.filters.push({
      column: this.currentColumn,
      values,
    });
    this.currentColumn = null;
    this.state = STATES.HAS_FILTER;
    return this;
  }

  to(outputFilePath) {
    this._assertState(STATES.HAS_FILTER);
    this.outputFilePath = outputFilePath;
    this.state = STATES.EXECUTED;
    return this.execute();
  }

  execute() {
    return new Promise((resolve, reject) => {
      const rows = [];
      fs.createReadStream(this.filePath)
        .pipe(csv.parse({ headers: true }))
        .on('error', error => reject(error))
        .on('data', (row) => {
          const passesFilters = this.filters.every(filter => {
            return filter.values.includes(row[filter.column]);
          });
          if (passesFilters) {
            rows.push(row);
          }
        })
        .on('end', (rowCount) => {
          console.log(`Parsed ${rowCount} rows`);
          csv.writeToPath(this.outputFilePath, rows, { headers: true })
            .on('error', err => reject(err))
            .on('finish', () => {
              console.log(`Filtered data written to ${this.outputFilePath}`);
              resolve();
            });
        });
    });
  }
}

module.exports = CsvQuery;