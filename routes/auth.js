const express = require('express');

const { check, body } = require('express-validator');

const authController = require('../controllers/auth');

const User = require('../models/user');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login',
    [
        body('email')
            .isEmail()
            .withMessage('Please enter a valid email address.')
            .normalizeEmail(),

        body('password', 'Password has to be valid.')
            .isLength({ min: 5 })
            .isAlphanumeric()
            .trim()
    ],
    authController.postLogin);

router.post('/signup',
    // 'email' is your element by name (html page)
[
    check('email')
        .isEmail()
        .withMessage('Please enter a valid email.')
        .custom((value, { req}) => {
            /*  Finding out if a user with that e-mail already exists.
                User.findOne({ email: value })
                Right side of the colon is the email we're extracting,
                left side is the field we're looking for in the database.

             */
            /*
                The express-validator package will check for a custom validator to return true or false,
                to return a thrown error or to return a promise.If it's a promise we ultimately return
                a promise because every then block implicitly returns a new promise,so if we return a
                promise then express validator will wait for this promise to be fulfilled

            */
            return User.findOne({ email: value })
                .then (userDoc => {
                    if (userDoc) {
                        return Promise.reject(
                            'E-mail exists already. Please pick a different one!'
                        );
                    }
                })
        })
        .normalizeEmail(),

    body(
            'password',
            'Please enter a password with only numbers and text and at least 5 characters.'
        )
            .isLength({ min: 5 })
            .isAlphanumeric()
            .trim(),
    // comparing passwords for equality
    body('confirmPassword')
        /*
            you can write your own validator using .custom in case
            the build in validators do not satisfy your needs
        */
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords have to match!');

            }
            return true;
    })
        ],
    authController.postSignup);

router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);

module.exports = router;
