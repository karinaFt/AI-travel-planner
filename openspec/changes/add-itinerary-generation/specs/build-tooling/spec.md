# Spec Delta

## MODIFIED Requirements

### Requirement: Setup documentation
The project SHALL include a README that states the Node.js prerequisite, explains how to create `server/.env` from `server/.env.example`, describes every environment variable, and lists every script with its purpose. It SHALL explain how to get a free Gemini API key that is never charged, and state the free tier's limits and data-use terms.

#### Scenario: Following the README
- **WHEN** a new developer follows the README steps on a fresh clone
- **THEN** they can install dependencies, configure the environment and open the running application without consulting other sources

#### Scenario: Getting a free API key
- **WHEN** a developer follows the README's API key steps
- **THEN** they get a Gemini API key on the free tier, in a project without billing, and know which variable to put it in
