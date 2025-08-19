const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const dotenv = require("dotenv").config({ path: __dirname + "/.env" });
const { manifestTransform } = require("./scripts/transform");
const path = require('path')

module.exports = (env, options) => {
  return {
    devtool: 'source-map',
    entry: {
      content_script: "./src/content-scripts/index.js",
      amazon_main_product: path.join(__dirname, 'src', 'content-scripts', 'amazon', 'product-page.js'),
      amazon_product_hunter_script: path.join(__dirname, 'src', 'content-scripts', 'amazon', 'product-hunter.js'),
      amazon_copy_all_asins_script: path.join(__dirname, 'src', 'content-scripts', 'amazon', 'copy-all-asins.js'),
      ebay_all_products_page: path.join(__dirname, 'src', 'content-scripts', 'ebay', 'product-page.js'),
      ebay_prelist_script: path.join(__dirname, 'src', 'content-scripts', 'ebay', 'prelist-product.js'),
      ebay_list_product_script: path.join(__dirname, 'src', 'content-scripts', 'ebay', 'list-product.js'),
      hide_personal_info_script: path.join(__dirname, 'src', 'content-scripts', 'ebay', 'hide-personal-info.js'),
      ebay_list_product_uk_script: path.join(__dirname, 'src', 'content-scripts', 'ebay', 'list-product-uk.js'),
      ebay_post_list_product_uk_script: path.join(__dirname, 'src', 'content-scripts', 'ebay', 'post-list-product.js'),
      ebay_scan_listing_script: path.join(__dirname, 'src', 'content-scripts', 'ebay', 'scan-listings.js'),
      ebay_single_product_script: path.join(__dirname, 'src', 'content-scripts', 'ebay', 'single-product-page.js'),
      ebay_boost_listing_script: path.join(__dirname, 'src', 'content-scripts', 'ebay', 'boost-listing.js'),
      ebay_inject_view_sku_script: path.join(__dirname, 'src', 'content-scripts', 'ebay', 'inject-view-sku.js'),
      ebay_revise_listing_script: path.join(__dirname, 'src', 'content-scripts', 'ebay', 'revise-listing.js'),
      ebay_tracking_script: path.join(__dirname, 'src', 'content-scripts', 'ebay', 'tracking.js'),
      ebay_vero_alert_handler: path.join(__dirname, 'src', 'content-scripts', 'ebay', 'vero-alert-handler.js'),
      background: "./src/background.js",
      popup: "./src/pages/popup/index.js",
      option: "./src/pages/options/index.js",
      panel: "./src/pages/panel/index.js",
      product_hunter: "./src/pages/product-hunter/index.js",
      bulk_lister: "./src/pages/bulk-lister/index.js",
      competitor_search: "./src/pages/competitor-search/index.js",
      collage_template_editor: "./src/pages/collage-template-editor/index.js",
      listing_setup: "./src/pages/collage-template-editor/listing-setup-index.js",
      ebay_items_scanner: "./src/pages/ebay-items-scanner/index.js",
      users_page: "./src/pages/users/index.js",
      vero_brands_page: "./src/pages/vero-brands/index.js",
      duplicate_checker: "./src/pages/duplicate-checker/index.js",
      boost_listing: "./src/pages/boost-listing/index.js",
      tracker_page: "./src/pages/tracker/index.js",
      settings: path.join(__dirname, 'src', 'pages', 'settings', 'index.js'),
    },
    module: {
      rules: [
        {
          test: /\.worker\.js$/,
          use: { loader: "worker-loader" }
        },
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: [
            'babel-loader'
          ]
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"]
        },
        {
          test: /\.(gif|png|jpe?g|svg)$/i,
          use: [
            "file-loader",
            {
              loader: "image-webpack-loader",
              options: {
                bypassOnDebug: true, // webpack@1.x
                disable: true // webpack@2.x and newer
              }
            }
          ]
        }
      ]
    },
    resolve: {
      extensions: ['.mjs', '*', '.js', '.jsx', '.css', '.json'],
    },
    output: {
      path: __dirname + "/dist",
      publicPath: "/",
      filename: "[name].bundle.js"
    },
    optimization: {
      minimize: options.mode === "production",
    },
    plugins: [
      new CopyWebpackPlugin(
        [
          { from: "./src/pages/popup/popup.html", force: true },
          { from: "./src/pages/options/option.html", force: true },
          { from: "./src/pages/panel/panel.html", force: true },
          { from: "./src/pages/product-hunter/product-hunter.html", force: true },
          { from: "./src/pages/bulk-lister/bulk-lister.html", force: true },
          { from: "./src/pages/competitor-search/competitor-search.html", force: true },
          { from: "./src/pages/collage-template-editor/collage-template-editor.html", force: true },
          { from: "./src/pages/collage-template-editor/listing-setup.html", force: true },
          { from: "./src/pages/ebay-items-scanner/ebay-items-scanner.html", force: true },
          { from: "./src/pages/users/users.html", force: true },
          { from: "./src/pages/vero-brands/vero-brands.html", force: true },
          { from: "./src/pages/duplicate-checker/duplicate-checker.html", force: true },
          { from: "./src/pages/boost-listing/boost-listing.html", force: true },
          { from: "./src/pages/tracker/tracker.html", force: true },
          { from: "./src/pages/settings/settings.html", force: true },
          { from: "./src/app/", force: true }
        ],
        {}
      ),
      new webpack.DefinePlugin({
        "process.env": JSON.stringify({ ...options, ...dotenv.parsed })
      }),
      new CopyWebpackPlugin([
        {
          from: "./src/app/manifest.json",
          force: true,
          transform(content, path) {
            return manifestTransform(content, path, options);
          }
        }
      ])
    ],
    devServer: {
      contentBase: "./dist",
      hot: true
    },
  };
};
