module.exports = {
  apps : [{
    name: 'yndx-stock-bot',
    script: 'index.js',
    exec_mode: 'cluster',
    instances : 1,
    env: {
      'NODE_ENV': 'production'
    }
  }]
};
