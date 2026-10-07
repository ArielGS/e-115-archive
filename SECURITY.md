# Security policy

Archive 115 is a static site: no servers, accounts, databases or user data. The realistic risks are in what the build produces and in how it is built, for example:

- Markdown or directive attributes that end up as unescaped HTML (script injection in a guide page);
- a compromised or malicious npm dependency;
- GitHub Actions workflows that could leak tokens or publish something unintended;
- the container image (`Dockerfile`, `nginx.conf`).

## Reporting a vulnerability

**Do not open a public issue.** Use GitHub's private reporting instead:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability**.
3. Describe the problem, how to reproduce it and what an attacker could do with it.

Only the maintainers see the report. You should get an answer within 7 days. Once a fix is released we will publish an advisory and credit you, unless you prefer to stay anonymous.

## Supported versions

Only the latest commit on `main` (what is deployed) receives fixes.
