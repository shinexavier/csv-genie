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
    *   **AI-Powered Classification**: Automatically classify and standardize data using a custom stereotype definition file.
    *   **Flexible AI Provider**: Choose between Google Gemini, OpenAI, or a local LLM for classification.
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
    *   **AI Classification**: You can select `[✨ Classify with AI]` to trigger the AI-powered workflow.
6.  **Confirm Mapping**: Before the transformation runs, you will be shown a color-coded summary of the mapping for a final confirmation.

### Using AI-Powered Classification

The AI classification feature allows you to use a Large Language Model to automatically categorize and standardize your data.

#### 1. Configure your AI Provider

You have two options for providing your API key:

**Option 1: Secure Runtime Prompt (Recommended)**
For maximum security, you can omit the API key from your environment. When you run the `transform` command, the tool will detect that the key is missing and securely prompt you to enter it. The key will be masked and used only for the current session; it will **not** be saved to disk.

**Option 2: Environment File (Convenient)**
For convenience in a trusted development environment, you can store your API key in a `.env` file.

*   Copy the `.env.example` file to a new file named `.env`.
*   Open the `.env` file and add the required information for your chosen provider. You only need to fill out the one you plan to use.

    *   **For Google Gemini:**
        ```
        GEMINI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        ```
    *   **For OpenAI:**
        ```
        OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        ```
    *   **For a Local LLM:**
        ```
        LOCAL_LLM_ENDPOINT=http://localhost:8080/completion
        ```
        *(Note: The payload and response structure for local models can vary. The current implementation sends a generic prompt and expects a JSON object in response.)*

#### 2. Create a Stereotype Definition File
    *   This is a JSON file that defines the categories you want to classify your data into. It tells the AI how to group your source data and what the final mapped values should be.
    *   See `data/product-stereotypes.json` for a detailed example.

#### 3. Run the `transform` command
*   When prompted to map a field, choose the `[✨ Classify with AI]` option.
*   The tool will then ask you to:
    1.  **Select your AI Provider** (Google Gemini, OpenAI, or Local LLM).
    2.  Provide the **source column** to use for context (e.g., `product_name`).
    3.  Provide the path to your **stereotype definition file**.
*   The tool will then use your selected AI provider to classify the data and apply the correct values to the target field.

#### 4. Debugging AI Classification
If you encounter errors during AI classification, you can use the `--debug` flag to get more insight into the process.

```bash
node index.js transform --debug
```

When you run with this flag, a `debug.log` file will be created in the project root. This file will contain:
*   The exact prompt that was sent to the AI model.
*   The raw, unparsed response that was received from the model.
*   A summary of token usage and the estimated cost for the API call.

This information is invaluable for understanding why a request might be failing or why the model is not returning the expected data format.

A summary of the token usage and estimated cost will also be printed to the console after every successful AI classification, even without the `--debug` flag.

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