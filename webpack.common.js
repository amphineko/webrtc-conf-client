const path = require('path')

const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const HtmlPlugin = require('html-webpack-plugin')

module.exports = {
    context: path.resolve(__dirname, 'src'),

    entry: './index.tsx',

    module: {
        rules: [
            {
                test: /\.(css)$/,
                use: [
                    'style-loader',
                    'css-loader',
                ],
            },
            {
                exclude: /node_modules/,
                test: /\.(ts|tsx)$/,
                use: [
                    'babel-loader',
                    'ts-loader',
                ],
            },
        ],
    },

    output: {
        filename: '[name].[contenthash:8].js',
        path: path.resolve(__dirname, 'dist'),
    },

    plugins: [
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: ['!config.*']
        }),
        new HtmlPlugin({
            template: 'index.html',
        }),
    ],

    resolve: { extensions: ['.js', '.ts', '.tsx'] },
}
