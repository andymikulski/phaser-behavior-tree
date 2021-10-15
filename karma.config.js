const webpackConfig = require('./webpack.config.js');
webpackConfig.mode = 'production';

module.exports = function(config) {
  config.set({
    singleRun: false,

    browsers: [
      'PhantomJS'
    ],

    frameworks: [
      'jasmine'
    ],

    files: [
      'spec.bundle.js'
    ],

    reporters: [
      'verbose'
    ],

    preprocessors: {
      'spec.bundle.js': ['webpack']
    },

    webpack: webpackConfig,

    webpackMiddleware: {
      stats: 'errors-only'
    },

    plugins: [
      require('karma-jasmine'),
      require('karma-phantomjs-launcher'),
      require('karma-webpack'),
      require('karma-verbose-reporter')
    ]
  });
};