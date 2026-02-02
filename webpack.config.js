const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');

module.exports = function (options, webpack) {
  return {
    ...options,
    externals: [
      nodeExternals({
        allowlist: ['webpack/hot/poll?100'],
      }),
    ],
    module: {
      ...options.module,
      rules: [
        ...options.module.rules,
        {
          test: /\.node$/,
          use: 'node-loader',
        },
      ],
    },
    plugins: [
      ...options.plugins,
      new webpack.IgnorePlugin({
        resourceRegExp: /^@nestjs\/microservices$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^(@grpc\/grpc-js|@grpc\/proto-loader|kafkajs|mqtt|nats|ioredis|amqplib|amqp-connection-manager)$/,
      }),
      new webpack.IgnorePlugin({
        checkResource(resource) {
          const lazyImports = [
            '@mapbox/node-pre-gyp',
            'mock-aws-s3',
            'aws-sdk',
            'nock',
            'node-gyp',
            '@css-inline/css-inline-linux-x64-gnu',
            '@css-inline/css-inline-linux-x64-musl',
          ];
          if (!lazyImports.includes(resource)) {
            return false;
          }
          try {
            require.resolve(resource);
          } catch (err) {
            return true;
          }
          return false;
        },
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^(bcrypt|@mapbox\/node-pre-gyp|node-gyp)$/,
      }),
    ],
  };
};
