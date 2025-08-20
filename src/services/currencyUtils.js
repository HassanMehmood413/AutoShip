/**
 * Get currency symbol based on domain URL
 * @param {string} domain - The domain URL (e.g., 'amazon.com', 'ebay.co.uk')
 * @returns {string} Currency symbol
 */
export const getCurrencySymbolFromDomain = (domain) => {
  if (!domain) return '$';
  
  const domainLower = domain.toLowerCase();
  
  // US domains
  if (domainLower.includes('.com') || domainLower.includes('usa')) {
    return '$';
  }
  
  // UK domains
  if (domainLower.includes('.co.uk') || domainLower.includes('uk')) {
    return '£';
  }
  
  // German domains
  if (domainLower.includes('.de') || domainLower.includes('germany')) {
    return '€';
  }
  
  // Italian domains
  if (domainLower.includes('.it') || domainLower.includes('italy')) {
    return '€';
  }
  
  // French domains
  if (domainLower.includes('.fr') || domainLower.includes('france')) {
    return '€';
  }
  
  // Spanish domains
  if (domainLower.includes('.es') || domainLower.includes('spain')) {
    return '€';
  }
  
  // Canadian domains
  if (domainLower.includes('.ca') || domainLower.includes('canada')) {
    return 'C$';
  }
  
  // Australian domains
  if (domainLower.includes('.au') || domainLower.includes('australia')) {
    return 'A$';
  }
  
  // Default to USD
  return '$';
};

/**
 * Get currency symbol based on user's selected domain setting
 * @param {string} selectedDomain - The selected domain from user settings ('USA', 'UK', etc.)
 * @returns {string} Currency symbol
 */
export const getCurrencySymbolFromSelectedDomain = (selectedDomain) => {
  if (!selectedDomain) return '$';
  
  const domain = selectedDomain.toUpperCase();
  
  switch (domain) {
    case 'USA':
      return '$';
    case 'UK':
      return '£';
    case 'GERMANY':
    case 'DE':
      return '€';
    case 'ITALY':
    case 'IT':
      return '€';
    case 'FRANCE':
    case 'FR':
      return '€';
    case 'SPAIN':
    case 'ES':
      return '€';
    case 'CANADA':
    case 'CA':
      return 'C$';
    case 'AUSTRALIA':
    case 'AU':
      return 'A$';
    default:
      return '$';
  }
};

/**
 * Get currency symbol based on current page URL
 * @returns {string} Currency symbol
 */
export const getCurrencySymbolFromCurrentURL = () => {
  const currentURL = window.location.href;
  return getCurrencySymbolFromDomain(currentURL);
};