# CSV Filtering Utility

This is a powerful and flexible command-line utility for filtering large CSV files. It provides two modes of operation: an interactive mode for guided filtering and a programmatic, fluent API for more complex and automated tasks.

## Features

*   **Interactive Mode**: A user-friendly, step-by-step process for filtering CSV files.
*   **Fluent API**: A chainable, programmatic interface for advanced filtering and scripting.
*   **Dynamic Filtering**: Filter by any column and select multiple values to include in the output.
*   **State-Aware API**: The fluent API enforces a logical order of operations, preventing common errors.
*   **Large File Support**: Efficiently processes large CSV files without loading the entire file into memory.

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/shinexavier/csv-genie.git
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```

## Usage

### Interactive Mode

To use the interactive filter, run the following command:

```bash
npm start filter
```

The CLI will guide you through the process of selecting the input file, the column to filter by, and the values to include.

### Fluent API

The fluent API provides a programmatic way to filter your data. You can see an example of this in the `index.js` file under the `query` command.

To run the example query, use the following command:

```bash
npm start query
```

You can customize the query in `index.js` to suit your needs:

```javascript
await new CsvQuery()
  .from('data/bigbasket_products.csv')
  .filter()
  .column('category')
  .valuesIn(["Beverages", "Eggs, Meat & Fish"])
  .to('filtered_products.csv');
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.