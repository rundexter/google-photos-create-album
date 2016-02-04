var _ = require('lodash')
    , request = require('request')
    //, xml2js = require('xml2js')
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
            , strPublic = isPublic ? 'public' : 'private'
            , allowComments = step.input('comments_allowed').first() || false
            , strAllowComments = allowComments ? 'true' : 'false'
            , token = dexter.provider('google').credentials('access_token')
            , user = 'default'
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
            , self = this
        ;
        request
            .post(url, {
                headers: headers
                , body: xml 
                , secure: false
            })
            .on('error', function(err) {
                self.fail(err);
            })
            .on('response', function(response, body) {
                self.complete({});
            })
        ;
    }
};
