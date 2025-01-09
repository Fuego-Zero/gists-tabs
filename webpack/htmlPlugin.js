const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { PAGES_PATH } = require('./constant');

const htmlPlugin = ['Newtab', 'Options', 'Popup', 'Devtools', 'Panel'].map((item) => {
  const _item = item.toLowerCase();

  return new HtmlWebpackPlugin({
    template: path.join(PAGES_PATH, item, 'index.html'),
    filename: `${_item}.html`,
    chunks: [_item],
    cache: false,
  });
});

module.exports = htmlPlugin;
