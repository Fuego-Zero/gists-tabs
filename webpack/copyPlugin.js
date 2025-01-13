const CopyWebpackPlugin = require('copy-webpack-plugin');

const { OUTPUT_PATH } = require('./constant');

const isDevelopment = process.env.NODE_ENV !== 'production';

const CopyPlugin = [
  new CopyWebpackPlugin({
    patterns: [
      {
        from: 'src/manifest.json',
        to: OUTPUT_PATH,
        force: true,
        transform(content) {
          content = JSON.parse(content.toString());
          if (isDevelopment) content.name = `${content.name} (Development)`;

          return Buffer.from(
            JSON.stringify({
              description: process.env.npm_package_description,
              version: process.env.npm_package_version,
              ...content,
            }),
          );
        },
      },
    ],
  }),
].concat(
  ['src/pages/Content/content.styles.css', 'src/assets/img/icon-128.png', 'src/assets/img/icon-34.png'].map(
    (item) =>
      new CopyWebpackPlugin({
        patterns: [
          {
            from: item,
            to: OUTPUT_PATH,
            force: true,
          },
        ],
      }),
  ),
);

module.exports = CopyPlugin;
