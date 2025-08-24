# 🔄 Extension Reload Instructions

## Issue
The extension is getting permission errors for eBay URLs because it needs to be reloaded to pick up the new manifest permissions.

## Solution

### Step 1: Reload the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Find the "AutoShip" extension
3. Click the **refresh/reload button** (🔄) next to the extension
4. Or toggle the extension **OFF** and then **ON** again

### Step 2: Verify Permissions
After reloading, the extension should have permissions for:
- `https://www.ebay.com/*`
- `https://www.ebay.co.uk/*`
- `https://www.ebay.de/*`
- `https://www.ebay.fr/*`
- `https://www.ebay.it/*`
- `https://www.ebay.es/*`
- `https://www.ebay.com.au/*`
- `https://www.ebay.ca/*`

### Step 3: Test the Flow
1. Go to the Competitor Scanner
2. Run the scanner with test sellers
3. Check that no permission errors appear in console
4. Go to "Show Results in Ebay Grabber"
5. Data should now be displayed

## Alternative: Manual Content Script
If you still have issues, you can:
1. Navigate to an eBay page (e.g., https://www.ebay.co.uk)
2. Go to the "Proceed to Filter Results" page
3. Click "Manually Trigger Content Script"
4. This will manually execute the content script on the current tab

## Debug Tools Available
- **Show Data Status**: Shows all storage keys and product counts
- **Debug Storage**: Shows detailed storage information
- **Force Reload Data**: Reloads data from storage
- **Test Competitor Search**: Sets up test data
- **Manually Trigger Content Script**: Manually executes content script

## Expected Results
After reloading the extension:
- ✅ No permission errors in console
- ✅ Competitor scanner opens eBay tabs successfully
- ✅ Content script runs and collects data
- ✅ "Proceed to Filter Results" page displays collected items
- ✅ All filters and buttons work correctly 