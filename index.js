const EventEmitter = require('events');
const assert = require('assert');
const Primus = require('primus');
const uglify = require('uglify-js');

function PrimusWebpackPlugin(options) {
    this.options = Object.assign(
        {},
        {
          filename: 'primus-client.js',
          minify: false,
          primusOptions: {},
        },
        options
    );
}

PrimusWebpackPlugin.prototype.apply = function(compiler) {

    compiler.hooks.compilation.tap('emit', (compilation, cb) => {
        const primus = new Primus(new EventEmitter(), this.options.primusOptions);

        if (this.options.primusOptions.plugins) {
          this.options.primusOptions.plugins.forEach(plugin => {
            assert(plugin.name, 'Plugin must have name!');
            assert(plugin.plugin, 'Plugin must have plugin!');

            primus.plugin(plugin.name, plugin.plugin);
          });
        }

        const clientLib = primus.library();
        const filename = this.options.filename.replace(
          '[hash]',
          compilation.hash
        );
        const source = this.options.minify
          ? uglify.minify(clientLib, { fromString: true })
          : { code: clientLib };

        compilation.assets[filename] = {
          source() {
            return source.code;
          },
          size() {
            return source.code.length;
          },
        };

        primus.destroy();
    });

    compiler.hooks.compilation.tap('htmlWebpackPluginBeforeHtmlGeneration', compilation => {
        compilation.hooks.htmlWebpackPluginBeforeHtmlProcessing.tapAsync('PrimusWebpackPlugin', (data, cb) => {
            const filename = this.options.filename.replace(
                '[hash]',
                compilation.hash
            );
            const publicPath = compilation.outputOptions.publicPath || "";


            // We are putting Primus script before other JavaScript files
            // because we are expecting other bundles to use Primus
            data.assets.js.unshift(`${publicPath}${filename}`)
            cb(null, data);
        })
    });
}

module.exports = PrimusWebpackPlugin;