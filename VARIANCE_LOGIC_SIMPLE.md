# Variance Logic - Simplified (Most Recent Period Only)

## What Changed

### Old Logic (main branch)
- Required **BOTH** Week 1→2 and Week 2→3 to exceed threshold AND move in same direction
- Example that wouldn't show:
  - Week 1: $1.00, Week 2: $1.00, Week 3: $0.70 (W2→W3: -30%)
  - Reason: Week 1→2 had 0% change

### New Logic (test-weighted-variance branch)

**Weekly Variance Report:**
- **Only Week 2→3 matters** for the threshold check
- Week 1 is displayed for context but doesn't affect whether a site shows up

**Monthly Variance Report:**
- Shows if **ANY** of these transitions exceeds threshold:
  - Month 2→3
  - Month 3→Current (MTD)
  - Month 2→Current (MTD)
- Displays whichever variance is largest
- Month 1 is displayed for context only

Much simpler and focuses on most recent trend!

## Examples (with 10% threshold)

### Example 1: Consistent Drop (Shows in both versions)
- Week 1: $1.00
- Week 2: $0.85 (W1→W2: -15%)
- Week 3: $0.70 (W2→W3: -17.6%)
- **Old**: Shows (both >10%, consistent)
- **New**: Shows (W2→W3 = -17.6%)

### Example 2: Sudden Drop (NEW - now shows!)
- Week 1: $1.00
- Week 2: $1.00 (W1→W2: 0%)
- Week 3: $0.70 (W2→W3: -30%)
- **Old**: Doesn't show (W1→W2 = 0%)
- **New**: Shows (W2→W3 = -30%)

### Example 3: Drop with Rebound
- Week 1: $1.00
- Week 2: $0.80 (W1→W2: -20%)
- Week 3: $0.95 (W2→W3: +18.75%)
- **Old**: Doesn't show (inconsistent direction)
- **New**: Shows (W2→W3 = +18.75%)

### Example 4: Small Recent Change
- Week 1: $1.00
- Week 2: $0.70 (W1→W2: -30%)
- Week 3: $0.75 (W2→W3: +7.1%)
- **Old**: Doesn't show (W2→W3 < 10%)
- **New**: Doesn't show (W2→W3 = +7.1% < 10%)

## Visual Display

The Max Variance column shows the Week 2→3 change.

**Tooltip on hover** shows both transitions:
```
Week 1→2: -15.0%
Week 2→3: -17.6% (shown)
```

This helps you see the full context even though only W2→W3 determines if it shows up.

## Why This Approach?

1. **Simpler logic**: No need to check consistency between two transitions
2. **More recent focus**: Week 2→3 is the most current trend
3. **Catches sudden changes**: A site that was stable but suddenly dropped will now appear
4. **Week 1 still useful**: Provides context to see if it's part of a longer trend

## Testing

Open the app and check both variance reports:

**Weekly Variance Report:**
- All sites where Week 2→3 variance exceeds your threshold (default 10%)
- Week 1 values displayed for context
- Tooltip showing W1→W2 and W2→W3 when hovering over Max Variance

**Monthly Variance Report:**
- All sites where **any** of Month 2→3, Month 3→Current, or Month 2→Current exceeds threshold
- Shows the largest variance
- Previous months displayed for context
- Tooltip showing all three variances (Month 2→3, Month 3→Current, Month 2→Current) with indicator of which is shown

## Rolling Back

If you don't like this change:

```bash
git checkout main
git branch -D test-weighted-variance
```

## Files Modified

- `standalone-server.js`: 
  - Simplified `calculateVariance()` to only use W2→W3
  - Simplified `calculateMonthlyVariance()` to only use Month 3→Current
- `public/app.js`: 
  - Added tooltip to weekly variance showing W1→W2 and W2→W3
  - Added tooltip to monthly variance showing all month-over-month changes
