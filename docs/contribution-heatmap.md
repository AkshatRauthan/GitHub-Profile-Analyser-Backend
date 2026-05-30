# Contribution Heatmap

Fetch live GitHub contribution data for any public username, filtered by time period.

**`GET /api/v1/profiles/:username/heatmap?period=<period>`**

This is a **separate live API** — data is fetched from GitHub GraphQL on each request and is not stored in the database.

---

## Time periods

| Period | Range |
|--------|-------|
| `currWeek` | Start of current week (Sunday) → today |
| `currMonth` | 1st of current month → today |
| `currYear` | January 1 of current year → today (default) |

## Example requests

```bash
GET /api/v1/profiles/octocat/heatmap?period=currWeek
GET /api/v1/profiles/octocat/heatmap?period=currMonth
GET /api/v1/profiles/octocat/heatmap?period=currYear
```

## Response

```json
{
  "success": true,
  "message": "Contribution heatmap retrieved successfully",
  "data": {
    "githubUsername": "octocat",
    "period": "currMonth",
    "from": "2026-05-01T00:00:00.000Z",
    "to": "2026-05-30T23:59:59.999Z",
    "totalContributions": 42,
    "days": [
      { "date": "2026-05-01", "count": 3 },
      { "date": "2026-05-02", "count": 0 },
      { "date": "2026-05-03", "count": 5 }
    ]
  }
}
```

## How it works

Uses GitHub GraphQL `contributionsCollection(from, to)` with the `contributionCalendar` field — the same data that powers GitHub's green contribution graph on profile pages.

## Notes

- Does **not** require prior profile analysis
- Invalid `period` returns `400` with allowed values listed
- `GITHUB_TOKEN` recommended for GraphQL rate limits
- Profile analyze flow does **not** include heatmap data — use this endpoint separately

## Related

- [Profile Analysis](profile-analysis.md)
- [API Reference](api-reference.md)
