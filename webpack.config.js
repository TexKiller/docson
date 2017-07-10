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
    }
}