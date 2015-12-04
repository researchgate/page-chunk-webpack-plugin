/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Daniel Tschinder @danez
 */
var nextIdent = 0;

function PathChunkPlugin(options) {
  this.chunkName = options.name;
  this.filenameTemplate = options.filename;
  this.test = options.test;
  this.ident = __filename + (nextIdent++);
}

module.exports = PathChunkPlugin;
PathChunkPlugin.prototype.apply = function(compiler) {
  var filenameTemplate = this.filenameTemplate;
  var chunkName = this.chunkName;
  var ident = this.ident;
  var test = this.test;
  compiler.plugin('compilation', function(compilation) {
    compilation.plugin('optimize-chunks', function(chunks) {
      // only optimize once
      if (compilation[ident]) return;
      compilation[ident] = true;

      var pathChunk = chunks.filter(function(chunk) {
        return chunk.name === chunkName;
      })[0];
      if (!pathChunk) {
        pathChunk = this.addChunk(chunkName);
        pathChunk.initial = pathChunk.entry = true;
      }

      var usedChunks = chunks.filter(function(chunk) {
        if (chunk === pathChunk) return false;
        return true;
      });

      var isModuleMatching;
      if (typeof test === 'function') {
        isModuleMatching = test;
      } else if (typeof test === 'string') {
        isModuleMatching = function(userRequest) { return userRequest.indexOf(test) >= 0; };
      } else {
        isModuleMatching = function(userRequest) { return userRequest.match(test); };
      }

      var commonModules = [];
      var addCommonModule = function(module) {
        if (commonModules.indexOf(module) < 0 && module.userRequest && isModuleMatching(module.userRequest)) {
          commonModules.push(module);
        }
      };

      usedChunks.forEach(function(chunk) {
        chunk.modules.forEach(addCommonModule);
      });

      commonModules.forEach(function(module) {
        usedChunks.forEach(function(chunk) {
          module.removeChunk(chunk);
        });
        pathChunk.addModule(module);
        module.addChunk(pathChunk);
      });

      usedChunks.forEach(function(chunk) {
        chunk.parents = [pathChunk];
        pathChunk.chunks.push(chunk);
        if (chunk.entry) {
          chunk.entry = false;
        }
      });

      if (filenameTemplate) {
        pathChunk.filenameTemplate = filenameTemplate;
      }

      this.restartApplyPlugins();
    });
  });
};
