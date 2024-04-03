const mongoose = require('mongoose');
const fileHelper = require('../util/file');

const { validationResult } = require('express-validator');

const Product = require('../models/product');

const ITEMS_PER_PAGE = 2;

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: []
  });
};


exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const price = req.body.price;
    const description = req.body.description;
    const image = req.file;
    const name = req.file.filename;

    if (!image) {
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            product: {
                title: title,
                price: price,
                description: description
            },
            hasError: true,
            errorMessage:'Attached file is not an images.',
            validationErrors: []
        });
    }

    // validationResult(req) is all available via require('express-validator').
    //Extracts the validation errors from a request and makes them available in a Result object.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('admin/edit-product', {
                pageTitle: 'Add Product',
                path: '/admin/add-product',
                editing: false,
                product: {
                    title: title,
                    price: price,
                    description: description
                },
                hasError: true,
                errorMessage: errors.array()[0].msg,
                validationErrors: errors.array()
            });
        }

    // const imageUrl = image.path;
    const imageUrl = req.file.path;
    console.log(imageUrl);
    console.log(image);

    const product = new Product({
        title: title,
        price: price,
        description: description,
        imageUrl: imageUrl,
        userId: req.user,
        name: name
    });

    product
        // save()  method is coming from Mongoose
        .save()
        .then(result => {
            // console.log(result);

            console.log('Created Product');
            res.redirect('/admin/products');
        })
        .catch(err => {
            console.log(err);
            // const error = new Error(err);
            // error.httpStatusCode = 500;
            // /*
            //   By calling next(error) we actually let express know that an error occurred and it
            //   will skip all other middlewares and move right away to an error handling middleware
            // */
            // return next(error);
        })
};


exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
        validationErrors: []
      });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    })
};


exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Edit Product',
            path: '/admin/edit-product',
            editing: true,
            product: {
                title: updatedTitle,
                price: updatedPrice,
                description: updatedDesc,
                _id: prodId
            },
            hasError: true,
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }
  Product.findById(prodId)
      .then(product => {
          if (product.userId.toString() !== req.user._id.toString()) {
            return   res.redirect('/');
          }
          product.title = updatedTitle;
          product.price = updatedPrice;
          if (image) {
              fileHelper.deleteFile(product.imageUrl);
              product.imageUrl = image.path;
          }
          product.description = updatedDesc;
          return product
              .save()
              .then(result => {
                  console.log('UPDATED PRODUCT!');
                  res.redirect('/admin/products');
              })

      })
      .catch(err => {
          const error = new Error(err);
          error.httpStatusCode = 500;
          return next(error);
      })
    };


exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;

// find() is the Mongoose method, which gives all products automatically.
    Product.find({ userId: req.user._id })
        .countDocuments()
        .then(numProducts => {
            totalItems = numProducts;
            return Product.find()
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE);
        })
        .then(products => {
            res.render('admin/products', {
                prods: products,
                pageTitle: 'Admin Products',
                path: 'admin/products',
                currentPage: page,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
            });
        })
  // Product.find({ userId: req.user._id })
  //   // .select('title price -_id')
  //   // .populate('userId', 'name')
  //   .then(products => {
  //     res.render('admin/products', {
  //       prods: products,
  //       pageTitle: 'Admin Products',
  //       path: '/admin/products'
  //     });
  //   })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    })
};


exports.deleteProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            if (!product) {
                return next(new Error('Product not found.'));
            }
            fileHelper.deleteFile(product.imageUrl);
            //findByIdAndDelete is the mongoose method
            return Product.deleteOne({ _id: prodId, userId: req.user._id });
        })
        .then(() => {
            console.log('DESTROYED PRODUCT');
            res.status(200).json({ message: 'Success!'});
        })
        .catch(err => {
            res.status(500).json({ message: 'Deleting product failed!'});
        });
};







