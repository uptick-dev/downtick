# Variance Logic Changes (Option C - Net Change)

## What Changed

### Old Logic (main branch)
- Only showed sites where **BOTH** week-over-week transitions exceeded the threshold **AND** moved in the same direction
- Example that wouldn't show:
  - Week 1: $1.00, Week 2: $1.00, Week 3: $0.70 (-30% drop)
  - Reason: Week 1→2 had 0% change, so not consistent

### New Logic (test-net-change-variance branch)
- Shows sites where **consistent trend** OR **significant net change from Week 1 to Week 3** exceeds threshold
- Focuses on overall impact rather than individual week volatility
- Adds visual indicators for context:
  - **⚠️ Warning icon**: Appears for "net change" cases (volatile path but significant overall change)
  - **Tooltip on hover**: Shows Week 1→2, Week 2→3, and net change W1→W3

## Visual Indicators

### Consistent Trend (No Warning)
```
Max Variance: -17.6%
Hover shows: Week 1→2: -15.0%
             Week 2→3: -17.6%
```

### Net Change (Warning Icon)
```
Max Variance: -30.0% ⚠️
Hover shows: Net change W1→W3: -30.0%
             Week 1→2: 0%
             Week 2→3: -30.0%
```

## Examples (with 10% threshold)

### Example 1: Consistent Drop (Shows in both versions)
- Week 1: $1.00
- Week 2: $0.85 (-15%)
- Week 3: $0.70 (-17.6%)
- **Net W1→W3**: -30%
- **Display**: `-17.6%` (consistent trend, no warning)

### Example 2: Sudden Drop (NEW - shows via net change)
- Week 1: $1.00
- Week 2: $1.00 (0%)
- Week 3: $0.70 (-30%)
- **Net W1→W3**: -30%
- **Display**: `-30.0% ⚠️` (net change triggered it)

### Example 3: Drop with Partial Rebound (NEW - shows via net change)
- Week 1: $1.00
- Week 2: $0.80 (-20%)
- Week 3: $0.88 (+10%)
- **Net W1→W3**: -12%
- **Display**: `-12.0% ⚠️` (net change >10%)

### Example 4: Drop with Full Rebound (Does NOT show)
- Week 1: $1.00
- Week 2: $0.80 (-20%)
- Week 3: $0.95 (+18.75%)
- **Net W1→W3**: -5%
- **Display**: Not shown (net change <10%, not consistent)

## Testing

Run the app and check the Weekly Variance Report:

```bash
npm start
```

You should now see:
1. Sites with consistent trends (same as before)
2. Sites with significant net change W1→W3 (NEW - even if path was volatile)
3. Warning icons (⚠️) next to "net change" cases
4. Tooltips showing Week 1→2, Week 2→3, and net change when hovering over Max Variance

## Rolling Back

If you don't like this change:

```bash
# Switch back to main branch
git checkout main

# Delete the test branch
git branch -D test-net-change-variance
```

## Files Modified

- `standalone-server.js`: Updated `calculateVariance()` method
- `public/app.js`: Added warning icon and tooltip display
