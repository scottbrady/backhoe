var path = require('path'),
    m    = require('module');

/**
 * Module to clear the commonjs module cache and mock modules. Used
 * for development and testing.
 *
 * Don't use this module in production!
 **/
var Loader = {
    // prevent caching of all modules
    WILDCARD : '*',

    originalLoader : m._load,

    modules : [],

    mockedModules : {},

    //////////////////////////////////////////////////////////////////////////
    // Public methods ///////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    clear : function () {
        this.clearCache();
        this.clearMocks();
    },

    clearCache : function () {
        var self = this;
        this.modules.forEach(function (module) {
            self._deleteFromCache(module);
        });
    },

    clearMocks : function () {
        this.mockedModules = {};
    },

    mock : function (path, module) {
        this.mockedModules[path] = module;
    },

    noCache : function (basePath, directories) {
        this.basePath    = basePath || this.WILDCARD;
        this.directories = directories || [];

        m._load = this._interceptLoader.bind(this);
    },

    //////////////////////////////////////////////////////////////////////////
    // Psuedo-private methods ///////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    _saveModule : function (modulePath) {
        if (this.modules.indexOf(modulePath) === -1) {
            this.modules.push(modulePath);
        }
    },

    _matchesNoCache : function (moduleName) {
        var result = false,
            moduleFromBase;

        if (this.basePath === this.WILDCARD) {
            return true;
        }

        if (moduleName.indexOf('node_modules') !== -1) {
            return false;
        }

        moduleFromBase = moduleName.replace(path.join(this.basePath, '/'), '');

        this.directories.forEach(function (directory) {
            if (moduleFromBase.indexOf(directory) === 0) {
                result = true;
            }
        });

        return result;
    },

    _resolvePath : function (parent, file) {
        var base = path.dirname(parent.filename);
        return require.resolve(path.join(base, file));
    },

    _isValid : function (modulePath) {
        return modulePath[0] === '.';
    },

    _isMocked : function (path) {
        return this.mockedModules.hasOwnProperty(path);
    },

    _getMock : function (path) {
        return this.mockedModules[path];
    },

    _interceptLoader : function (request, parent, isMain) {
        var result = this.originalLoader(request, parent, isMain);

        if (this._isValid(request)) {
            var modulePath = this._resolvePath(parent, request);

            if (this._isMocked(modulePath)) {
                result = this._getMock(modulePath);
            }

            if (this._matchesNoCache(modulePath)) {
                this._saveModule(modulePath);
            }
        }

        return result;
    },

    _deleteFromCache : function (path) {
        delete require.cache[path];
    }
};

module.exports = Loader;