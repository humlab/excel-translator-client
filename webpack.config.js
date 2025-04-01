import webpack from 'webpack';
import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env, config) => {
    return {
      mode: 'production',
      entry: {
        main: path.resolve(__dirname, './src/js/main.js'),
      },
      output: {
        path: path.resolve(__dirname, './dist'),
        filename: '[name].bundle.js',
        publicPath: '/',
        assetModuleFilename: '[name][ext][query]',
      },
      optimization: {
        minimize: false, // Disable minification because it breaks exceljs for some reason
      },
      plugins: [
        new HtmlWebpackPlugin({
          template: path.resolve(__dirname, './src/index.html'), // Template file
          filename: 'index.html', // Output file
        }),
        new CleanWebpackPlugin(),
        new webpack.ProvidePlugin({
          $: 'jquery',
          jQuery: 'jquery',
        }),
        new CopyWebpackPlugin({
          patterns: [
            { from: 'data', to: 'data', noErrorOnMissing: true }, // Adjust path as needed
          ],
        }),
      ],
      module: {
        rules: [
          {
            test: /\.html$/,
            use: ['html-loader'],
          },
          {
            test: /\.webmanifest$/,
            use: [
              {
                loader: 'file-loader',
                options: {
                  name: 'site.webmanifest',
                  outputPath: '/',
                },
              },
            ],
          },
          {
            test: /\.js$/,
            exclude: /node_modules/,
            use: [
              'source-map-loader', 
              {
                loader: 'babel-loader',
                options: {
                  presets: [
                    [
                      '@babel/preset-env',
                      {
                        targets: {
                          browsers: [
                            "last 2 versions",
                            "ie >= 11",
                            "safari >= 9",
                            "> 0.2%",
                            "not dead",
                          ],
                        },
                        useBuiltIns: 'entry',
                        corejs: '3.32',
                        modules: false,
                        debug: false,
                      },
                    ],
                  ],
                },
              },
            ],
          },
          {
            test: /\.(?:ico|gif|png|jpg|jpeg|svg)$/i,
            type: 'asset/resource',
          },
          {
            test: /\.(woff(2)?|eot|ttf|otf|)$/i,
            type: 'asset/inline',
          },
          {
            test: /\.(css)$/i,
            use: ['style-loader', 'css-loader'],
          },
          {
            test: /\.(scss)$/i,
            use: ['style-loader', 'css-loader', 'sass-loader'],
          },
        ],
      },
      devServer: {
        historyApiFallback: true,
        static: {
          directory: path.join(__dirname, 'dist'),
        }
      },
    };
  };