# CSV Processing Utility

This is a powerful and flexible command-line utility for processing large CSV files. It provides interactive commands for common tasks like filtering and transforming data, as well as a programmatic, fluent API for more complex scripting.

## Features

*   **Interactive Commands**: User-friendly, step-by-step processes for filtering and transforming CSV files.
*   **Filtering**:
    *   Filter by any column.
    *   Select multiple values to include in the output.
*   **Transformation**:
    *   Convert CSV to other formats (currently JSON).
    *   Map CSV columns to a target schema.
    *   Intelligent auto-mapping with a configurable similarity threshold.
*   **Fluent API**: A chainable, programmatic interface for advanced filtering.
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

This utility provides several commands to process your CSV files.

### `filter`

The `filter` command allows you to interactively filter a CSV file.

To use the interactive filter, run the following command:
```bash
npm start filter
```
The CLI will guide you through the process of selecting the input file, the column to filter by, and the values to include.

### `transform`

The `transform` command allows you to convert CSV files into other formats, with an initial focus on JSON. It provides a rich, interactive experience to ensure the transformation is accurate and meets your needs.

To use the transform command, run:
```bash
npm start transform
```
The command will guide you through the following steps:
1.  **Select Input/Output Files**: You will be prompted to provide the paths for the source CSV and the target output file.
2.  **Choose Target Format**: Select the desired output format (currently supports JSON).
3.  **Provide JSON Schema**: Specify the path to a JSON schema file that defines the structure of the target file.
4.  **Set Similarity Threshold**: You can set a similarity threshold (from 0.0 to 1.0) to control the sensitivity of the automatic column mapping. A higher threshold will only suggest very close matches.
5.  **Map Columns**: For each field in your target schema, you can map it to a column from the source CSV.
    *   **Semantic Suggestions**: The tool will automatically suggest the most likely mapping based on the similarity of the field names.
    *   **Skip Fields**: You can choose to skip a mapping for any field. These fields will be included in the output with a `null` value.
    *   **Unnamed Columns**: If the tool detects a column without a name in your CSV, it will prompt you to provide one.
6.  **Confirm Mapping**: Before the transformation runs, you will be shown a color-coded summary of the mapping for a final confirmation.

### Fluent API (`query` command)

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