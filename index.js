/**
 * Copyright: (c) 2016 Max Klein
 * License: MIT
 */

'use strict';

const fs = require('fs');
const path = require('path');
const stream = require('stream');

const express = require('express');
const MultiStream = require('multistream');
const base64 = require('base64-stream');

const configPath = path.join(__dirname, 'config.json');

const baseDir = path.join(__dirname, 'resources');
const scriptPath = path.join(baseDir, 'main.js');

function sstream(str) {
	const s = new stream.Readable();
	s._read = function () {};
	s.push(str);
	s.push(null);
	return s;
}

const rStringEntities = /['\n\t\\]/g;
const stringEntitiesMap = {
	"'": "\\'",
	'\n': '\\n',
	'\t': '\\t',
	'\\': '\\\\'
};
function escapeString(p) {
	return p.replace(rStringEntities, function (s) {
		return stringEntitiesMap[s];
	});
}

function readConfig(cb) {
	fs.readFile(configPath, function (err, str) {
		if(err) {
			cb(err);
			return;
		}

		try {
			const data = JSON.parse(str);

			const resources = data['resources'].map(function (p) {
				return {
					name: path.normalize(p),
					fullPath: path.join(baseDir, p)
				}
			});

			cb(null, {
				bookmarkletVersion: data['bookmarkletVersion'],
				resources: resources
			});
			return;
		} catch(e) {
			cb(e);
			return;
		}
	});
}

module.exports = function () {
	const router = new express.Router();

	router.get('/s.js', function (req, res, next) {
		const bmVersion = +req.query['v'];

		res.set('Content-Type', 'application/javascript; charset=utf-8');

		readConfig(function (err, config) {
			if(err) {
				next(err);
				return;
			}

			const bmOutdated = !!(isNaN(bmVersion) || bmVersion < config.bookmarkletVersion);
			const resources = config.resources;

			const streams = [];
			streams.push(sstream('(function (BM_OUTDATED,BUNDLED_RESOURCES) {'));
			streams.push(fs.createReadStream(scriptPath));
			streams.push(sstream('})(' + bmOutdated + ',{'));
			resources.forEach(function (resource) {
				streams.push(sstream("'" + escapeString(resource.name) + "':'"));
				streams.push(fs.createReadStream(resource.fullPath).pipe(base64.encode()));
				streams.push(sstream("',"));
			});
			streams.push(sstream('})'));
			new MultiStream(streams).pipe(res);
		});
	});

	return router;
};
