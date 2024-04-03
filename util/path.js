/*
    Using helper function for naviagtion. In order to write a cleaner code we can
    use helper function and then pass it through the files where it is necessary.
*/

const path = require('path');
// it gives us the path to the directory we need
module.exports = path.dirname(process.mainModule.filename);
// dirname returns the directory name of a path
// process returns global var (do not need to import it )
