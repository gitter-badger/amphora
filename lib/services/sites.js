'use strict';
var _ = require('lodash'),
  files = require('../files'),
  path = require('path');

/**
 * Normalize path to always exist, always start with a slash, and never end with a slash.
 *
 * @param {string} urlPath
 * @returns {string}
 */
function normalizePath(urlPath) {
  if (!urlPath) {
    urlPath = '/';
  } else if (_.first(urlPath) !== '/') {
    urlPath = '/' + urlPath;
  }

  if (urlPath.length > 1 && _.last(urlPath) === '/') {
    urlPath = urlPath.substring(0, urlPath.length - 1);
  }

  return urlPath;
}

/**
 * Normalize directory to never start with slash, never end with slash, and always exist
 * @param {string} dir
 * @returns {string}
 */
function normalizeDirectory(dir) {
  if (!dir || dir === path.sep) {
    dir = '.';
  } else if (_.first(dir) === path.sep) {
    dir = dir.substr(1);
  }

  if (dir.length > 1 && _.last(dir) === path.sep) {
    dir = dir.substring(0, dir.length - 1);
  }

  return dir;
}

/**
 * generate site config map
 * @return {{}}
 */
function getSites() {
  var fullConfig = {},
    instanceSitesFolder = path.resolve('sites');

  files.getFolders(instanceSitesFolder).forEach(function (site) {
    var dir = path.join(instanceSitesFolder, site),
      siteConfig = files.getYaml(path.join(dir, 'config')),
      localConfig = files.getYaml(path.join(dir, 'local'));

    //apply locals over site config
    if (localConfig) {
      _.assign(siteConfig, localConfig);
    }

    //normalize
    siteConfig.slug = site;
    siteConfig.path = normalizePath(siteConfig.path);
    siteConfig.dir = dir;
    siteConfig.assetPath = normalizePath(siteConfig.assetPath);
    siteConfig.assetDir = normalizeDirectory(siteConfig.assetDir || 'public');

    // check to make sure sites have default properties
    if (!siteConfig.host) {
      throw new Error('Missing host in site config');
    }

    // add site config to the sites map
    fullConfig[siteConfig.slug] = siteConfig;
  });

  return fullConfig;
}

/**
 * get site config that matches a specific host + path
 * @param {string} host
 * @param {string} path (make sure it starts with a slash!)
 * @returns {object}
 */
function getSite(host, path) {
  // note: uses the memoized version
  return _.find(module.exports.sites(), function (site) {
    return site.host === host && site.path === path;
  });
}

module.exports.sites = _.memoize(getSites);
module.exports.get = getSite;

// exported for tests
module.exports.normalizePath = normalizePath;
module.exports.normalizeDirectory = normalizeDirectory;
