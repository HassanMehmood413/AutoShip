# AutoShip — 1-Click Amazon → eBay Listing Assistant
**(Chrome / Edge / Firefox / Opera / Brave • Manifest V3 • React + MUI • Webpack)**

> Import **any number of products** from **Amazon** and list them on **eBay**—with titles, descriptions, images, and prices—**instantly**.  
> AutoShip uses an LLM (e.g., **GPT-5 via API**) to understand products, generate compliant listings, auto-reprice for margins, monitor stock/price, support **bulk uploads**, and help sellers **stay within platform policies**.

---

## Why AutoShip?
- ⏱️ **Save 10–15 minutes per listing:** No more copy-paste between Amazon and eBay.
- ✅ **Reduce errors:** Standardized, consistent listing data and formatting.
- 📈 **Scale with confidence:** Bulk upload hundreds of products with batch rules.
- 💰 **Protect margins:** Smart repricing accounts for fees and shipping so profits stay intact.
- 🔄 **Stay updated:** Live monitoring of Amazon price/stock to adjust your eBay listing.

---

## Features
- **Cross-browser, MV3 extension** (Chrome, Edge, Firefox, Opera, Brave).
- **React 18 + Material UI** popup & options pages; **Webpack** bundling.
- **Content-script helpers** to scrape, parse, and validate product data.
- **Background service** for long-running tasks and message routing.
- **LLM-assisted listing generation** (titles, bullets, descriptions, attributes).
- **Smart Repricing** with target margin + automatic fee/shipping considerations.
- **Real-time sync** for Amazon stock/price → optional price updates on eBay.
- **Bulk uploads** with batch rules for titles, categories, and pricing.
- **Policy-aware prompts** to help stay within eBay/Amazon guidelines.
- **Built-in services**: `DbService`, `messagePassing`, `chromeService`, plus React helpers (e.g., `FrameMUI` to mount MUI in iframes).
- **Developer-friendly structure** and scripts to build for multiple browsers.

---


## Prerequisites
- **Node**: `v16.1.0` (as used in this boilerplate; newer Node may work but is not guaranteed)
- **Yarn**: `1.22.10`

> 💡 If you use newer Node/Yarn, pin dependencies or update configs as needed.

---

## Install & Build

### Local Development (Chromium)
```bash
yarn
yarn dev:chromium
```
![Built with React](https://img.shields.io/badge/React-18-informational)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)


