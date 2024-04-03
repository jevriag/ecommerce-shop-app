const path = require('path');
const fs = require('fs');
const https = require('https');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
// To protect from CSRF attacks
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
// helmet helps to secure Express JS setting HTTP headers
const helmet = require("helmet");
const compression = require('compression');
const morgan = require("morgan");

const errorController = require('./controllers/error');
const User = require('./models/user');

const MONGODB_URI = process.env.mongoDbUri;

const nunjucks = require('nunjucks');

const app = express();
//it needs to know in which database, on which database/server to store your data.
const store = new MongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions'
});

const csrfProtection = csrf();

/*
    set up a storage for files, Diskstorage is a storage engine
    which you can use with multer where you can pass JS object .
    destination takes the file name.
    cb(null, 'images') if that is null, you tell multer that
    it's OK to store it and then the second argument is the place
    where you do want to store it, like that images folder.
    filename:  lets multer know how to name it
    file.filename + '-' + file.originalname) if we have two images
    with the same name, they don't overwrite each other. I'll
    concatenate it
    i will pass fileStorage to app.use(multer({storage: fileStorage}).single('images'));

*/

// SSl keys
// const privateKey = fs.readFileSync('server.key');
// const certificate = fs.readFileSync('server.cert');

const storage = multer.diskStorage({
    destination(req, file, cb) {
        console.log('smth file=>', file);
        cb(null, path.join(__dirname ,'images'))

    },
    filename(req, file, cb) {
        // const id = uuid();
        cb(null, new Date().getTime() + '-' + file.originalname)
    },
});

const fileFilter = (req, file, cb) => {
    console.log(file);
    console.log(file.mimetype);
    // mimetype (A media type) is a two-part identifier for file
    // formats and format contents transmitted on the Internet.
    if (
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg'
    ) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

nunjucks.configure('views', {
    autoescape: true,
    express: app
});

app.set('view engine', 'html');


const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');


const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'access.log'),
    { flags: 'a' }
);

app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: accessLogStream }));
/*
/*
    For extracting the content of our incoming requests we need
    a special middleware bodyParser.urlencoded where urlencoded
    is a text data
*/
app.use(bodyParser.urlencoded({extended: false}));
/*
  but for file (e.g uploading images) we need to handle our data
  by using multer which parses incoming requests with mixed data:
  text and file
  single('images')) tbc find our more info
  http://expressjs.com/en/resources/middleware/multer.html
*/
app.use(multer({
    storage: storage,
    limits: {fileSize: 1024 * 1024 * 5},
    fileFilter: fileFilter
}).single('image'));
app.use(express.static(__dirname + '/public'));
app.use('/images', express.static(__dirname + '/images'));

const SECRET = process.env.mySecret;

app.use(
    session ({
        secret: SECRET,
        resave: false,
        saveUninitialized: false,
        store: store
    })
);


app.use(csrfProtection);
app.use(flash());

/*
    we want to add a csrf token to our authentication status
    on every page we render.
    This allows us to set local variables that are passed into
    the views, local simply because well they will only exist
    in the views which are rendered.
*/
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.use ((req, res, next) => {
    //throw new Error('Sync dummy') you can throw the error in synchronous code like this
    if (!req.session.user) {
        return next();
    }
    User.findById(req.session.user._id)
        .then(user => {
            if (!user){
               return next();
            }
            req.user = user;
            next();
        })
        .catch(err => {
        /*
            but inside of promise, then or catch blocks or
            inside of callbacks, you have to use next around the error.
         */
            next(new Error(err));
        })
});


app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
//
app.get('/500', errorController.get500);
app.use(errorController.get404   );

/*
    An error handling middleware(central error handler) which was imported
    from admin.js (postAddProduct), in case an error is happened
*/
app.use((error, req, res, next) => {
    console.log(error);
    // res.status(error.httpStatusCode).render()
    res.redirect('/500')
});

mongoose
    .connect(MONGODB_URI,
        {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            useFindAndModify: false
        }
    )
    .then(result => {
        // https.createServer({
        //     key: privateKey,
        //     cert: certificate
        // }, app)
            app.listen(process.env.PORT || 3000);
    })
    .catch(err => {
        console.log(err);
    });



