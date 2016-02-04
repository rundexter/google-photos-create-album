var _ = require('lodash')
    , request = require('request')
    , xml2js = require('xml2js')
    , q = require('q')
;
module.exports = {
    /**
     * The main entry point for the Dexter module
     *
     * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {AppData} dexter Container for all data used in this workflow.
     */
    run: function(step, dexter) {
        var album = step.input('album').first().toLowerCase()
            , summary = step.input('summary').first() || ''
            , isPublic = step.input('public').first() || false
            , allowComments = step.input('comments_allowed').first() || false
            , token = dexter.provider('google').credentials('access_token')
            , user = 'default'
            , self = this
        ;
        this.albumExists(album, user, token)
            .then(function(exists) {
                if(exists) {
                    self.log('Album already exists');
                    return q();
                }
                return self.createAlbum(album, summary, user, isPublic, allowComments, token);
            })
            .then(function() {
                self.complete({});
            })
            .fail(self.fail)
        ;
    }
    , createAlbum: function(album, summary, user, isPublic, allowComments, token) {
        var strPublic = isPublic ? 'public' : 'private'
            , strAllowComments = allowComments ? 'true' : 'false'
            , headers = {
                'GData-Version': 2
                , 'Authorization': 'Bearer ' + token
                , 'Content-Type': 'application/atom+xml'
            }
            , url = "https://picasaweb.google.com/data/feed/api/user/" + user
            , xml = [
                '<entry xmlns="http://www.w3.org/2005/Atom"',
                '    xmlns:media="http://search.yahoo.com/mrss/"',
                '    xmlns:gphoto="http://schemas.google.com/photos/2007">',
                '  <title type="text">' + album + '</title>',
                '  <summary type="text">' + summary + '</summary>',
                '  <gphoto:access>' + strPublic + '</gphoto:access>',
                '  <gphoto:commentingEnabled>' + strAllowComments + '</gphoto:commentingEnabled>',
                '  <gphoto:timestamp>' + (new Date()).getTime() + '</gphoto:timestamp>',
                '  <media:group>',
                '    <media:keywords></media:keywords>',
                '  </media:group>',
                '  <category scheme="http://schemas.google.com/g/2005#kind"',
                '    term="http://schemas.google.com/photos/2007#album"></category>',
                '</entry>'
            ].join("")
            , deferred = q.defer()
        ;
        request
            .post(url, {
                headers: headers
                , body: xml 
                , secure: false
            })
            .on('error', function(err) {
                deferred.reject(err);
            })
            .on('response', function(response, body) {
                deferred.resolve('');
            })
        ;
        return deferred.promise;
    }
    , albumExists: function(album, user, token) {
        var self = this;
        return q.npost(self, 'albums', [token, user])
            .then(function(data) {
                var found = false;
                self.log("Looking for " + album + "' in albums", {
                    albums: data.feed.entry
                });
                _.each(data.feed.entry, function(entry) {
                    var title = entry.title[0].toLowerCase();
                    if(title === album) {
                        found = true;
                        return false;
                    }
                });
                return q(found);
            })
        ;
    }
    , albums: function(token, user, callback) {
        var headers = {
                'GData-Version': 2
                , 'Authorization': 'Bearer ' + token
                , 'Content-Length': 0
            }
            , url = "https://picasaweb.google.com/data/feed/api/user/" + user
            , self = this
        ;
        request
            .get(url, {
                headers: headers
            }, function(err, resp, body) {
                if(err) {
                    return callback(err, null);
                }
                if(resp.statusCode !== 200) {
                    self.log('Invalid response', { response: resp, body: body });
                    return callback(new Error('Bad response, status code ' + resp.statusCode));
                }
                xml2js.parseString(body, callback);
            });
        ;
    }
};
