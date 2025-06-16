module.exports = {
  apps : [{
    name: 'yndx-stock-bot',
    script: 'index.js',
    exec_mode: 'cluster',
    instances : 1,
    interpreter : "/home/sbmaxx/.nvm/versions/node/v20.19.0/bin/node",
    env: {
      'NODE_ENV': 'production'
    }
  }]
};
