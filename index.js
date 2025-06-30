#!/usr/bin/env node

const fs = require('fs');
const { program } = require('commander');
const { default: inquirer } = require('inquirer');
const csv = require('fast-csv');
const chalk = require('chalk');
const stringSimilarity = require('string-similarity');
const axios = require('axios');
require('dotenv').config();

program
  .version('1.1.0')
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
        validate: (value) => {
            try {
                if (fs.statSync(value).isFile()) {
                    return true;
                }
            } catch (e) {
                // Catches non-existent paths
            }
            return 'Please enter a valid path to a file.';
        }
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
const getApiKey = async (providerName, envVar) => {
    if (process.env[envVar]) {
        return process.env[envVar];
    }
    const { apiKey } = await inquirer.prompt([
        {
            type: 'password',
            name: 'apiKey',
            message: `API key for ${providerName} not found. Please enter it now (it will not be saved):`,
            mask: '*',
        }
    ]);
    return apiKey;
};

program
  .command('transform')
  .description('Transform a CSV file to another format')
  .option('--debug', 'Enable debug logging')
  .action(async (options) => {
    const { inputFile } = await inquirer.prompt([
      {
        type: 'input',
        name: 'inputFile',
        message: 'Enter the path to the input CSV file:',
        default: 'data/bigbasket_products.csv',
        validate: (value) => {
            try {
                if (fs.statSync(value).isFile()) {
                    return true;
                }
            } catch (e) {
                // Catches non-existent paths
            }
            return 'Please enter a valid path to a file.';
        }
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
                validate: (value) => {
                    try {
                        if (fs.statSync(value).isFile()) {
                            return true;
                        }
                    } catch (e) {
                        // Catches non-existent paths
                    }
                    return 'Please enter a valid path to a schema file.';
                }
            }
        ]);

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
                        choices: ['(skip)', '[✨ Classify with AI]', ...headers],
                        default: bestMatch.rating > similarityThreshold ? bestMatch.target : null,
                        loop: false,
                    }
                ]);

                if (csvColumn === '(skip)') {
                    mapping[field] = { type: 'skip' };
                } else if (csvColumn === '[✨ Classify with AI]') {
                    const { contextColumn } = await inquirer.prompt([
                        {
                            type: 'list',
                            name: 'contextColumn',
                            message: `Which CSV column provides context for classifying the "${field}" field?`,
                            choices: headers,
                            loop: false,
                        }
                    ]);

                    const { stereotypeFile } = await inquirer.prompt([
                        {
                            type: 'input',
                            name: 'stereotypeFile',
                            message: 'Enter the path to the JSON stereotype definition file:',
                            validate: (value) => {
                                try {
                                    if (fs.statSync(value).isFile()) {
                                        // It's a file, now check if it's valid JSON
                                        JSON.parse(fs.readFileSync(value, 'utf-8'));
                                        return true;
                                    }
                                } catch (e) {
                                    if (e.code === 'ENOENT') {
                                        return 'File not found. Please enter a valid path.';
                                    }
                                    if (e instanceof SyntaxError) {
                                        return 'File is not valid JSON.';
                                    }
                                    // Other errors (e.g., not a file)
                                    return 'Please enter a valid path to a JSON file.';
                                }
                                return 'Please enter a valid path to a JSON file.';
                            }
                        }
                    ]);

                    mapping[field] = {
                        type: 'ai_classify',
                        contextColumn: contextColumn,
                        stereotypeFile: stereotypeFile
                    };
                }
                else {
                    mapping[field] = { type: 'direct', value: csvColumn };
                }
            }

            console.log('\n--- Mapping Summary ---');
            console.log('Target Field (JSON)  ->  Source Field (CSV)');
            console.log('------------------------------------------');
            for(const field in mapping) {
                const mapInfo = mapping[field];
                let sourceDisplay;
                if (mapInfo.type === 'skip') {
                    sourceDisplay = chalk.gray('null');
                } else if (mapInfo.type === 'direct') {
                    sourceDisplay = chalk.yellow(mapInfo.value);
                } else if (mapInfo.type === 'ai_classify') {
                    sourceDisplay = chalk.magenta(`AI Classification (using ${mapInfo.contextColumn})`);
                }
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

        const aiClassificationTasks = Object.entries(mapping).filter(([, mapInfo]) => mapInfo.type === 'ai_classify');
        const classificationCache = {};

        if (aiClassificationTasks.length > 0) {
            const { default: ora } = await import('ora');
            const { aiProvider } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'aiProvider',
                    message: 'Select the AI provider for classification:',
                    choices: ['Google Gemini', 'OpenAI', 'Local LLM'],
                    loop: false,
                }
            ]);

            for (const [field, mapInfo] of aiClassificationTasks) {
            // Get the API key first, without any spinner running.
            let apiKey;
            if (aiProvider === 'Google Gemini') {
                apiKey = await getApiKey('Google Gemini', 'GEMINI_API_KEY');
            } else if (aiProvider === 'OpenAI') {
                apiKey = await getApiKey('OpenAI', 'OPENAI_API_KEY');
            }

            const spinner = ora(`Preparing data for "${field}" classification...`).start();
            const uniqueContextValues = new Set();
            await new Promise((resolve, reject) => {
                fs.createReadStream(inputFile)
                    .pipe(csv.parse({ headers: true }))
                    .on('data', (row) => {
                        if(row[mapInfo.contextColumn]) {
                            uniqueContextValues.add(row[mapInfo.contextColumn])
                        }
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });

            const stereotypeDefinition = JSON.parse(fs.readFileSync(mapInfo.stereotypeFile, 'utf-8'));
            
            spinner.text = `Asking AI to classify ${uniqueContextValues.size} unique values for "${field}"...`;

            const stereotypePromptPart = Object.entries(stereotypeDefinition).map(([name, details]) => {
                return `
- Stereotype Name: "${name}"
  - Description: ${details.description}
  - Potential Values (mValues): [${details.mValues.join(', ')}]
`;
            }).join('');

            const prompt = `
                You are a data classification expert. Your task is to classify a list of input values based on a provided set of stereotype definitions.

                Stereotype Definitions:
                ${stereotypePromptPart}

                Values to Classify:
                [${Array.from(uniqueContextValues).join(', ')}]

                Analyze the "Values to Classify" and assign each value to one of the stereotype names.
                Your output MUST be a single, valid JSON object. The keys of this object must be the stereotype names (e.g., "ByWeight", "ByPiece"). The value for each key must be an array of strings, containing all the input values that fall under that classification. If a value does not fit any stereotype, exclude it from the output.
            `;

            try {
                if (options.debug) {
                    fs.writeFileSync('debug.log', `--- PROMPT SENT TO ${aiProvider} ---\n\n${prompt}\n\n`);
                }

                let response;
                if (aiProvider === 'Google Gemini') {
                    if (!apiKey) throw new Error("API key for Google Gemini is required.");
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
                    response = await axios.post(url, {
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json" }
                    });
                } else if (aiProvider === 'OpenAI') {
                    if (!apiKey) throw new Error("API key for OpenAI is required.");
                    response = await axios.post('https://api.openai.com/v1/chat/completions', {
                        model: 'gpt-4o',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0,
                        response_format: { type: "json_object" },
                    }, { headers: { 'Authorization': `Bearer ${apiKey}` } });
                } else if (aiProvider === 'Local LLM') {
                    const endpoint = process.env.LOCAL_LLM_ENDPOINT;
                    const modelId = process.env.LOCAL_LLM_MODEL_ID;
                    if (!endpoint) throw new Error("LOCAL_LLM_ENDPOINT not found in .env file.");
                    if (!modelId) throw new Error("LOCAL_LLM_MODEL_ID not found in .env file.");
                    
                    response = await axios.post(endpoint, {
                        model: modelId,
                        prompt: prompt,
                        // Note: The payload for a local LLM may vary. This is a generic example.
                    });
                }

                let classifiedResult;
                let rawResponse;
                if (aiProvider === 'Local LLM') {
                    // For local LLMs, the response structure can vary. We log the entire body for debugging.
                    // This prevents the script from crashing before we can see the response.
                    const responseDataString = JSON.stringify(response.data, null, 2);
                    if (options.debug) {
                        // We use a different title to indicate it's the full object, not just the text content.
                        fs.appendFileSync('debug.log', `--- RAW RESPONSE OBJECT FROM ${aiProvider} ---\n\n${responseDataString}\n\n`);
                    }
                    // Now, try to extract the actual JSON string from common local LLM response formats.
                    const responseData = response.data;
                    if (responseData.content) {
                        rawResponse = responseData.content;
                    } else if (responseData.response) {
                        rawResponse = responseData.response;
                    } else if (typeof responseData === 'string') {
                        rawResponse = responseData;
                    } else if (responseData.choices && responseData.choices[0] && responseData.choices[0].text) {
                        rawResponse = responseData.choices[0].text; // Another common format
                    } else {
                        // If we still can't find it, we'll have to rely on the logged object for manual debugging.
                        // The JSON.parse later will likely fail, but at least we'll know why.
                        rawResponse = JSON.stringify(responseData);
                    }
                } else {
                    // This is the existing logic for Gemini and OpenAI
                    rawResponse = aiProvider === 'Google Gemini'
                        ? response.data.candidates[0].content.parts[0].text
                        : response.data.choices[0].message.content;
                    
                    if (options.debug) {
                        fs.appendFileSync('debug.log', `--- RAW RESPONSE FROM ${aiProvider} ---\n\n${rawResponse}\n\n`);
                    }
                }

                const usage = aiProvider === 'Google Gemini' ? response.data.usageMetadata : response.data.usage;
                if (usage) {
                    const PRICING = {
                        'OpenAI': { input: 5.00 / 1_000_000, output: 15.00 / 1_000_000 },
                        'Google Gemini': { input: 0.35 / 1_000_000, output: 1.05 / 1_000_000 }
                    };
                    const inputTokens = usage.promptTokenCount || usage.prompt_tokens;
                    const outputTokens = usage.candidatesTokenCount || usage.completion_tokens;
                    const totalTokens = usage.totalTokens || inputTokens + outputTokens;
                    const modelPricing = PRICING[aiProvider];
                    const cost = modelPricing ? ((inputTokens * modelPricing.input) + (outputTokens * modelPricing.output)).toFixed(6) : 'N/A';

                    const usageMessage = `
--- AI Usage & Cost ---
Provider: ${aiProvider}
Input Tokens: ${inputTokens}
Output Tokens: ${outputTokens}
Total Tokens: ${totalTokens}
Estimated Cost: $${cost}
-----------------------`;
                    if (options.debug) {
                        fs.appendFileSync('debug.log', usageMessage + '\n');
                    }
                    console.log(chalk.yellow(usageMessage));
                }

                if (aiProvider === 'Google Gemini') {
                    classifiedResult = JSON.parse(rawResponse);
                } else if (aiProvider === 'OpenAI') {
                    classifiedResult = JSON.parse(rawResponse);
                } else if (aiProvider === 'Local LLM') {
                    // Note: Response parsing for a local LLM may vary.
                    classifiedResult = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
                }
                
                const lookupMap = new Map();
                for (const stereotypeName in classifiedResult) {
                    const stereotypeData = stereotypeDefinition[stereotypeName];
                    if (stereotypeData) {
                        const mValues = stereotypeData.mValues;
                        for (const originalValue of classifiedResult[stereotypeName]) {
                            lookupMap.set(originalValue, mValues);
                        }
                    }
                }
                classificationCache[field] = lookupMap;
                spinner.succeed(`AI classification for "${field}" is complete.`);

            } catch (error) {
                spinner.fail(`AI classification for "${field}" failed.`);
                const errorMessage = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
                console.error(chalk.red('Error details:'), errorMessage);
                return;
            }
        }
    }

        const results = [];
        fs.createReadStream(inputFile)
          .pipe(csv.parse({ headers: headers, renameHeaders: true }))
          .on('data', (row) => {
            const transformedRow = {};
            for (const field of schemaFields) {
                const mapInfo = mapping[field];
                if (mapInfo.type === 'skip') {
                    transformedRow[field] = null;
                } else if (mapInfo.type === 'direct') {
                    transformedRow[field] = row[mapInfo.value] !== undefined ? row[mapInfo.value] : null;
                } else if (mapInfo.type === 'ai_classify') {
                    const contextValue = row[mapInfo.contextColumn];
                    const lookupMap = classificationCache[field];
                    const classifiedMValues = lookupMap.get(contextValue);
                    transformedRow[field] = classifiedMValues || null;
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