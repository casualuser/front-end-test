const webpack = require('webpack');

module.exports = {
    entry: {
        q1: './src/client/entry1.js',
        q2: './src/client/entry2.js'
    },
    output: {
        path: './public',
        filename: '[name].js'
    },
    plugins: [
       new webpack.DefinePlugin({
           __SERVER_PORT__: process.env.SERVER_PORT
       })
   ],
    module: {
        loaders: [
            {
                test: /.js$/,
                loader: 'babel'
            }
        ]
    }
}
