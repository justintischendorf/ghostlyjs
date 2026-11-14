# Security Policy

## Supported versions

GhostlyJs is in early development. Only the latest published version
receives security fixes.

## Reporting a vulnerability

Please do **not** report security vulnerabilities through public GitHub
issues, discussions or pull requests.

Instead, report them privately via
[GitHub private vulnerability reporting](https://github.com/justintischendorf/ghostlyjs/security/advisories/new).

Please include:

- a description of the issue and its impact
- affected versions

You will get a response as soon as possible. Once the issue is confirmed,
a fix will be released and the advisory published.

## Scope

GhostlyJs runs a local development server (`ghostly dev`) that receives
measurements from your app. It listens on localhost only, and measurement
data never leaves your machine. Reports about this server (for example,
ways to reach it from outside localhost or to write files outside the
project) are especially welcome.

The generated skeleton files and the production runtime do not need the
dev server.
