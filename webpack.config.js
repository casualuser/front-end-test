const webpack = require('webpack');

console.log('PORT', process.env.SERVER_PORT);

module.exports = {
    entry: './question1/src/client/index.js',
    output: {
        path: './question1/dist',
        filename: 'client.js'
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
