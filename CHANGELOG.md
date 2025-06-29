# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-06-29

### Added

*   **`transform` command:** A new command to transform CSV files into other formats, starting with JSON.
*   **Interactive Mapping:** A guided, step-by-step process to map CSV columns to a target JSON schema.
*   **Semantic Auto-Mapping:** The tool intelligently suggests column mappings by finding the best match between the source and target fields.
*   **Configurable Similarity Threshold:** Users can set a similarity threshold (0.0 to 1.0) to control the sensitivity of the auto-mapping suggestions.
*   **Color-Coded Summary:** The mapping summary is color-coded for improved readability and easier confirmation.
*   **Unnamed Column Handling:** The tool detects and prompts the user to name any unnamed columns in the source CSV.
*   **Skippable Fields:** Users can choose to skip mapping for any field, which will then be set to `null` in the output JSON.

## [1.0.0] - 2025-06-18

### Added

*   Initial release of the CSV Filtering Utility.
*   Interactive CLI for guided filtering.
*   Fluent, programmatic API for advanced filtering.
*   Support for filtering by column and multiple values.
*   State machine to enforce a logical order of operations in the fluent API.
*   `.gitignore` to exclude unnecessary files from the repository.
*   `README.md` with project overview and usage instructions.
*   `CHANGELANGELOG.md` to document project history.