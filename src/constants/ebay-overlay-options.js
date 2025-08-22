export const ebayOverlayOptions = {
    allSellerSoldItem: {
        label: "All Seller's Sold Items",
        icon: "https://i.imgur.com/kSJM6qx.png",
    },
    whatTheySold: {
        label: "How Many They Sold",
        icon: "https://i.imgur.com/OkBGoHv.png",
    },
    copyInfo: {
        label: 'Copy Info',
        icon: "https://i.imgur.com/5FFvcTn.png"
    },
    sendSellerToScanner: {
        label: 'Save Seller',
        icon: "https://i.imgur.com/XL4inzI.png"
    },
    searchTitleActive: {
        label: 'Search Title (Active)',
        icon: "https://i.imgur.com/1MM3gmC.png"
    },
    searchTitleSold: {
        label: 'Search Title (Sold)',
        icon: "https://i.imgur.com/1MM3gmC.png"
    },
    amazon: {
        label: 'Search on Amazon',
        icon: "https://i.imgur.com/vBMlcAQ.png"
    },
    googleImages: {
        label: 'Search on Google Images',
        icon: "https://i.imgur.com/2G5FWiK.png"
    },
}

export const countryConfigurations = {
    USA: {
        defaultSections: [
            { id: 1, title: 'Shipping', content: '', enabled: true },
            { id: 2, title: 'Return', content: '', enabled: true },
            { id: 3, title: 'Contact Us', content: '', enabled: true },
            { id: 4, title: 'Payment', content: '', enabled: true },
            { id: 5, title: 'Feedback', content: '', enabled: true },
            { id: 6, title: '', content: '', enabled: true },
            { id: 7, title: '', content: '', enabled: true }
        ],
        listingText: 'Thank you for Supporting this American Family Run Business!'
    },
    UK: {
        defaultSections: [
            { id: 1, title: 'Delivery', content: '', enabled: true },
            { id: 2, title: 'Return', content: '', enabled: true },
            { id: 3, title: 'Contact Us', content: '', enabled: true },
            { id: 4, title: 'Payment', content: '', enabled: true },
            { id: 5, title: 'Feedback', content: '', enabled: true },
            { id: 6, title: '', content: '', enabled: true },
            { id: 7, title: '', content: '', enabled: true }
        ],
        listingText: 'Thank you for Supporting this British Family Run Business!'
    }
}