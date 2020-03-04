const merge = require('webpack-merge')
const path = require('path')

const BrowserSyncPlugin = require('browser-sync-webpack-plugin')

const common = require('./webpack.common')

module.exports = merge(common, {
    devServer: {
        contentBase: path.resolve(__dirname, 'dist'),
        port: 3100,
    },

    devtool: 'inline-source-map',

    mode: 'development',

    plugins: [
        new BrowserSyncPlugin({
            host: 'localhost',
            open: false,
            proxy: 'http://localhost:3100/',
        }),
    ],
})
