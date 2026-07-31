Plana Stats Raid Data Import Context

Implement a server-side importer for raid formation data published by Plana Stats.

Data Sources

Manifest:

https://d10ckrrtuobdz8.cloudfront.net/v2/manifest.json

The manifest contains available raid entries, including regions and raid dates. Use it to detect newly available datasets.

Example raid database:

https://d10ckrrtuobdz8.cloudfront.net/v2/JP/20260325.db

The database URL pattern appears to be:

https://d10ckrrtuobdz8.cloudfront.net/v2/{REGION}/{YYYYMMDD}.db

Treat the manifest structure and URL pattern as undocumented external interfaces that may change.

Database Format

The .db files are DuckDB databases, not SQLite databases.

The example database contains tables such as:

complete_runs
student_build
students
difficulty_stats

Inspect the actual table schema before implementing mappings. Do not assume column names or use SELECT * in the production importer.