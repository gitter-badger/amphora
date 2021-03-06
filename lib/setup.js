'use strict';

var express = require('express'),
  routes = require('./routes'),
  bootstrap = require('./bootstrap'),
  composer = require('./composer');

/**
 * optionally pass in an express app and/or templating engines
 * @param {object} [options]
 * @param {object} [options.app]
 * @param {object} [options.engines]
 * @returns {Promise}
 */
module.exports = function (options) {
  var app, engines, router;

  options = options || {};
  app = options.app || express(); // use new express app if not passed in
  engines = options.engines; // will be undefined if not passed in

  // init the router
  router = routes(app);

  // if engines were passed in, send them to the composer
  if (engines) {
    composer.addEngines(engines);
  }

  //look for bootstraps in components
  return bootstrap().then(function () {
    return router;
  });
};