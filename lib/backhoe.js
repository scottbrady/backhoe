var path = require('path'),
    m    = require('module');

/**
 * Module to clear the commonjs module cache and mock modules. Used
 * for development and testing.
 *
 * Don't use this module in production!
 **/
var Backhoe = {

    // prevent caching of all modules
    WILDCARD : '*',

    // the native module loader
    originalLoader : m._load,

    // array of modules that will be cache busted
    modules : [],

    // hash of all mocked modules
    mockedModules : {},

    //////////////////////////////////////////////////////////////////////////
    // Public methods ///////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
     * Backhoe.clear()
     *
     * Clears all modules in the cache and all mocks.
     **/
    clear : function () {
        this.clearCache();
        this.clearMocks();
    },

    /**
     * Backhoe.clearCache(module)
     * - module (String) Optional module name
     *
     * Clears all modules in Node's require cache.
     **/
    clearCache : function (module) {
        var self = this;
        if (typeof module === 'string') {
            this._deleteFromCache(module);
        } else {
            this.modules.forEach(function (module) {
                self._deleteFromCache(module);
            });
        }
    },

    /**
     * Backhoe.clearMocks()
     *
     * Clears all mocked modules.
     **/
    clearMocks : function () {
        this.mockedModules = {};
    },

    /**
     * Backhoe.mock(path, module)
     * - path (String): Full path to the module you want to mock
     * - module (Object): The object to return when the module is required
     *
     * Injects a mock module that will be returned when requiring this module path.
     **/
    mock : function (path, module) {
        this.mockedModules[path] = module;
    },

    /**
     * Backhoe.noCache(basePath, directories)
     * - basePath (String): Don't cache modules under this path
     * - directories (Array): Don't cache modules in these directories
     *
     * Tells Backhoe the path to modules you don't want cached.
     **/
    noCache : function (basePath, directories) {
        this.basePath    = basePath || this.WILDCARD;
        this.directories = directories || [];

        m._load = this._interceptLoader.bind(this);
    },

    //////////////////////////////////////////////////////////////////////////
    // Psuedo-private methods ///////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
     * Backhoe._saveModule(modulePath)
     * - modulePath (String): The full module path
     *
     * Store this module path.
     **/
    _saveModule : function (modulePath) {
        if (this.modules.indexOf(modulePath) === -1) {
            this.modules.push(modulePath);
        }
    },

    /**
     * Backhoe._matchesNoCache(moduleName)
     * - moduleName (String): The module name
     *
     * Determine if the module should be cached.
     **/
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

    /**
     * Backhoe._resolvePath(parent, file)
     * - parent (Object): The parent module
     * - file (String): The module file name
     *
     * Get the fully resolved path for the module.
     **/
    _resolvePath : function (parent, file) {
        var base = path.dirname(parent.filename);
        return require.resolve(path.join(base, file));
    },

    /**
     * Backhoe._isValid(modulePath)
     * - modulePath (String): The full module path
     *
     * Determine if the module is local or coming from node_modules.
     * We don't want to cache bust files in node_modules.
     **/
    _isValid : function (modulePath) {
        return modulePath[0] === '.';
    },

    /**
     * Backhoe._isMocked(path)
     * - path (String): The full module path
     *
     * Determine if we are mocking this module.
     **/
    _isMocked : function (path) {
        return this.mockedModules.hasOwnProperty(path);
    },

    /**
     * Backhoe._getMock(path)
     * - path (String): The full module path
     *
     * Return the mocked module.
     **/
    _getMock : function (path) {
        return this.mockedModules[path];
    },

    /**
     * Backhoe._interceptLoader(request, parent, isMain)
     * - request (Object)
     * - parent (Object)
     * - isMain (Boolean)
     *
     * The method called for every require().
     **/
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

    /**
     * Backhoe._deleteFromCache(path)
     * - path (String): The full module path
     *
     * Delete the module from the require cache.
     **/
    _deleteFromCache : function (path) {
        delete require.cache[path];
    }
};

module.exports = Backhoe;