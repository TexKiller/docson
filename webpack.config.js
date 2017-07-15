var webpack = require('webpack');

module.exports = {
    context: __dirname,
    entry: "./node-docson.js",
    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: "transform-loader?brfs"
            }
        ]
    },
    resolve: {
        alias: {
            handlebars: 'handlebars/dist/handlebars.min.js'
        },
        extensions: ['.js']
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false
            }
        })
    ],
    output: {
        libraryTarget: "var",
        library: "nodeDocson"
    }
}