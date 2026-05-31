const spotify = require('spotify-playing');

spotify(function(err, res) {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Result:', res);
  }
});
