# Purchase Manager 2.0

Comprehensive Purchase Management System for Hong Kong <-> Korea Logistics.

## Project Structure

- **index.html**: Main entry point. Single Page Application (SPA) structure.
- **styles.css**: All styles for the application.
- **app.js**: Main client-side logic (UI, State Management, API calls).
- **Code.js**: Google Apps Script (Backend) code. Deploy this to your Google Apps Script project.
- **process_orders.py**: Python utility for cleaning/migrating CSV data.

## Setup

1. **Host**: Deploy `index.html`, `styles.css`, and `app.js` to a web host (GitHub Pages, Netlify, etc.).
2. **Backend**: 
   - Copy the content of `Code.js` to a Google Apps Script project.
   - Deploy as a Web App (Execute as: Me, Access: Anyone).
   - Copy the Web App URL to `CONFIG.API_URL` in `app.js`.

## Features
- **Dashboard**: Real-time revenue, profit, and cost overview.
- **Pipeline**: Tracking from Order -> Purchase -> KR Warehouse -> HK Delivery -> Settlement.
- **Receipts**: Generate and download image receipts.
- **Multi-language**: Support for KR and CN.
