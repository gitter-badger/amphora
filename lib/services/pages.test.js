'use strict';

var _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  components = require('./components'),
  sinon = require('sinon'),
  expect = require('chai').expect,
  db = require('../services/db'),
  bluebird = require('bluebird');

describe(_.startCase(filename), function () {
  var sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(db);
    sandbox.stub(components, 'get');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('create', function () {
    var fn = lib[this.title];

    it('creates without content', function () {
      components.get.returns(bluebird.resolve({}));
      db.batch.returns(bluebird.resolve());

      return fn('domain.com/path/pages', {layout: 'domain.com/path/components/thing'}).then(function (result) {
        expect(result._ref).to.match(/^domain.com\/path\/pages\//);
        delete result._ref;
        expect(result).to.deep.equal({layout: 'domain.com/path/components/thing'});
      });
    });

    it('creates with content', function () {
      var uri = 'domain.com/path/pages',
        contentUri = 'domain.com/path/components/thing1',
        layoutUri = 'domain.com/path/components/thing2',
        data = { layout: layoutUri, content: contentUri },
        contentData = {},
        layoutReferenceData = {};

      components.get.withArgs(layoutUri).returns(bluebird.resolve(layoutReferenceData));
      components.get.withArgs(contentUri).returns(bluebird.resolve(contentData));
      db.batch.returns(bluebird.resolve());

      return fn(uri, data).then(function (result) {
        // self reference is returned, but in a new instance with a new name
        expect(result._ref).to.match(/^domain\.com\/path\/pages\//);

        // layout will be the same
        expect(result.layout).to.equal(layoutUri);

        // new data will be put into a new instance
        expect(result.content).to.match(/^domain\.com\/path\/components\/thing1\/instances\//);
      });
    });

    it('creates with content with inner references', function () {
      var uri = 'domain.com/path/pages',
        contentUri = 'domain.com/path/components/thing1',
        layoutUri = 'domain.com/path/components/thing2',
        innerContentUri = 'domain.com/path/components/thing3',
        innerContentInstanceUri = 'domain.com/path/components/thing4/instances/thing5',
        data = { layout: layoutUri, content: contentUri },
        contentData = { thing: {_ref: innerContentUri}, instanceThing: {_ref: innerContentInstanceUri}},
        layoutReferenceData = {},
        innerContentInstanceData = {more: 'data'};

      components.get.withArgs(layoutUri).returns(bluebird.resolve(layoutReferenceData));
      components.get.withArgs(contentUri).returns(bluebird.resolve(contentData));
      db.batch.returns(bluebird.resolve());
      db.get.withArgs(innerContentInstanceUri).returns(bluebird.resolve(JSON.stringify(innerContentInstanceData)));

      return fn(uri, data).then(function (result) {
        expect(result._ref).to.match(/^domain\.com\/path\/pages\//);
        expect(result.layout).to.equal(layoutUri);
        expect(result.content).to.match(/^domain\.com\/path\/components\/thing1\/instances\//);

        // This is complex, I know, but we're cloning things and giving them a random name -- Testing random is difficult.
        // There should be three ops, each has a unique instance key, and each writes to a unique ref.
        // Non-instance references are ignored

        var batchOps = db.batch.args[0][0];

        expect(batchOps[0].key).to.match(new RegExp('domain.com/path/components/thing4/instances/'));
        expect(batchOps[0].type).to.equal('put');
        expect(JSON.parse(batchOps[0].value)).to.deep.equal(innerContentInstanceData);

        expect(batchOps[1].key).to.match(new RegExp('domain.com/path/components/thing1/instances/'));
        expect(batchOps[1].type).to.equal('put');
        expect(JSON.parse(batchOps[1].value).thing).to.deep.equal({_ref: innerContentUri});
        expect(JSON.parse(batchOps[1].value).instanceThing._ref).to.match(new RegExp('domain.com/path/components/thing4/instances/'));

        expect(batchOps[2].key).to.match(new RegExp('domain.com/path/pages/'));
        expect(batchOps[2].type).to.equal('put');
        expect(JSON.parse(batchOps[2].value).layout).to.equal(layoutUri);
        expect(JSON.parse(batchOps[2].value).content).to.match(new RegExp('domain.com/path/components/thing1/instances/'));
      });
    });
  });

  describe('publish', function () {
    var fn = lib[this.title];

    it('publishes', function () {
      components.get.returns(bluebird.resolve({}));
      db.batch.returns(bluebird.resolve());

      return fn('domain.com/path/pages/thing', {layout: 'domain.com/path/components/thing'}).then(function (result) {
        expect(result).to.deep.equal({ layout: 'domain.com/path/components/thing@published' });
      });
    });
  });

  describe('replacePageReferenceVersions', function () {
    var fn = lib[this.title];

    it('adds version', function () {
      expect(fn({a: 'b'}, 'c')).to.deep.equal({ a: 'b@c' });
    });

    it('removes version', function () {
      expect(fn({a: 'b@c'})).to.deep.equal({ a: 'b' });
    });

    it('adds version in array', function () {
      expect(fn({a: ['b']}, 'c')).to.deep.equal({ a: ['b@c'] });
    });

    it('removes version in array', function () {
      expect(fn({a: ['b@c']})).to.deep.equal({ a: ['b'] });
    });

    it('ignores object type', function () {
      expect(fn({a: {b: 'bad data'}}, 'c')).to.deep.equal({ a: { b: 'bad data' } });
    });

    it('ignores boolean type', function () {
      expect(fn({a: true})).to.deep.equal({a: true});
    });
  });
});