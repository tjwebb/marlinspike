var SailsApp = require('sails').Sails;

beforeEach(function (done) {
  this.timeout(30000);
  let config = {
    log: {
      level: 'info'
    },
    hooks: {
      grunt: false,
      views: false
    }
  }

  global.sails = new SailsApp()

  global.sails.load(config, function(err, sails) {
    done(err)
  });
});

afterEach(function(done) {
  global.sails.lower(done);
});
