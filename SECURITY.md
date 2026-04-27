# Security Policy

## Reporting a Vulnerability

Please do not open public issues for security vulnerabilities.

Report suspected vulnerabilities through GitHub Security Advisories for this repository, or contact the maintainer privately if advisories are unavailable. Include the affected version or commit, reproduction steps, impact, and any suggested mitigation.

## Scope

AMC WebUI is a local-first web application that can connect to external model providers and optional proxy services. Security reports are especially useful when they involve:

- Exposure of API keys or provider credentials.
- Unsafe handling of uploaded files, imported data, or generated files.
- Cross-site scripting or unsafe HTML preview behavior.
- Deployment configuration that weakens default browser or server protections.

## Dependency Security

The project uses GitHub security features and Dependabot where available. Production dependency audit checks run in CI.
