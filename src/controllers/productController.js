const mongoose = require('mongoose')
const multer = require('multer')
const aws = require("aws-sdk");
const currencySymbol = require("currency-symbol-map")

const productModel = require('../models/productModel')

const isValid = function (value) {
    if (typeof value === 'undefined' || value === null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    if (typeof value === 'number' && value.toString().trim().length === 0) return false
    return true;
}

const isValidRequestBody = function (requestBody) {
    return Object.keys(requestBody).length > 0
}

const isValidObjectId = function (objectId) {
    return mongoose.Types.ObjectId.isValid(objectId)
}

// aws.config.update({
//     accessKeyId: "AKIAY3L35MCRRMC6253G",
//     secretAccessKey: "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",
//     region: "ap-south-1",
// })

// let uploadFile = async (file) => {

//     return new Promise(function (resolve, reject) {
//         // Create S3 service object
//         let s3 = new aws.S3({ apiVersion: "2006-03-01" });

//         var uploadParams = {
//             ACL: "public-read", /// this file is accesible publically..permission
//             Bucket: "classroom-training-bucket", // HERE
//             Key: "project-eval/Product/" + file.originalname, // HERE
//             Body: file.buffer,
//         };

//         s3.upload(uploadParams, function (err, data) {
//             if (err) {
//                 return reject({ "error": err });
//             }
//             console.log(data)
//             console.log(`File uploaded successfully. ${data.Location}`);
//             return resolve(data.Location); //HERE 
//         });
//     });
// };

aws.config.update({
    accessKeyId: "AKIAY3L35MCRSNFP6KRR",
    secretAccessKey: "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",
    region: "ap-south-1"
});

let s3 = new aws.S3({ apiVersion: '2006-03-01' });

const upload = async (file, fileName) => {
    // TODO: to increase caching of static assets (add max-age and immutable, remove no-cache)
    // TODO: consider using timestamps in all the file names to resolve fle replacement issue <Sabiha Khan>
    try {
        let uploadParams = {
            "ACL": "public-read",
            "ContentType": file.mimetype,
            Bucket: "fangame-stg",
            Key: file.folder + fileName,
            Body: file.buffer
        };

        return new Promise(function (resolve, reject) {
            s3.upload(uploadParams, function (err, data) {
                if (err !== null) {
                    reject(err);
                } else resolve(data);
            });
        })
    } catch(error) {
        throw new Error('error in uploadToS3')
    }

}

const createProduct = async function (req, res) {
    try {
        const requestBody = req.body;

        if (!isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: 'Invalid params received in request body' })
        }

        const { title, description, price, currencyId, currencyFormat, isFreeShipping, style, availableSizes, installments } = requestBody;

        if (!isValid(title)) {
            return res.status(400).send({ status: false, message: 'Title is required' })
        }

        const isTitleAlreadyUsed = await productModel.findOne({ title });

        if (isTitleAlreadyUsed) {
            return res.status(400).send({ status: false, message: 'Title is already used.' })
        }

        if (!isValid(description)) {
            return res.status(400).send({ status: false, message: 'Description is required' })
        }

        if (!isValid(price)) {
            return res.status(400).send({ status: false, message: 'Price is required' })
        }

        if (!(!isNaN(Number(price)))) {
            return res.status(400).send({ status: false, message: `Price should be a valid number` })
        }
        if (price<=0) {
            return res.status(400).send({ status: false, message: `Price should be a valid number` })
        }

        if (!isValid(currencyId)) {
            return res.status(400).send({ status: false, message: 'CurrencyId is required' })
        }

        if (!(currencyId == "INR")) {
            return res.status(400).send({ status: false, message: 'currencyId should be a INR' })
        }


        if (installments) {
            if (!(!isNaN(Number(installments)))) {
                return res.status(400).send({ status: false, message: `Installments should be a valid number` })
            }
        }

        if (isValid(isFreeShipping)) {

            if(!((isFreeShipping === "true")  || (isFreeShipping === "false"))){
                return res.status(400).send({ status: false, message: 'isFreeShipping should be a boolean value' })
            }
        }


        let downloadUrl;
        let productImage = req.files;
        if (!(productImage && productImage.length > 0)) {
            return res.status(400).send({ status: false, msg: "productImage is required" });
        }

        //upload to s3 and return true..incase of error in uploading this will goto catch block( as rejected promise)
        productImage[0].folder = 'projectEval/'
        downloadUrl = await upload(productImage[0], "product"); // expect this function to take file as input and give url of uploaded file as output 
        //   res.status(201).send({ status: true, data: uploadedFileURL });
        console.log("urllllll", downloadUrl)


        const productData = {
            title,
            description,
            price,
            currencyId,
            currencyFormat: currencySymbol(currencyId),
            isFreeShipping,
            style,
            installments,
            productImage: downloadUrl.Location
        }

        if(!isValid(availableSizes)) {
            return res.status(400).send({ status: false, message: 'availableSizes is required' })
        }

        if (availableSizes) {
            let array = availableSizes.split(",").map(x => x.trim())

            for (let i = 0; i < array.length; i++) {
                if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(array[i]))) {
                    return res.status(400).send({ status: false, message: `availableSizes should be among ${["S", "XS", "M", "X", "L", "XXL", "XL"].join(', ')}` })
                }
            }
            console.log(array)
            if (Array.isArray(array)) {
                productData['availableSizes'] = array
            }
        }

        const newProduct = await productModel.create(productData)
        res.status(201).send({ status: true, message: "Success", data: newProduct })

    } catch (error) {
        console.log(error)
        res.status(500).send({ status: false, data: error });
    }
}


const getAllProducts = async function (req, res) {
    try {
        const filterQuery = { isDeleted: false }
        const queryParams = req.query;

        if (isValidRequestBody(queryParams)) {
            const { size, name, priceGreaterThan, priceLessThan, priceSort} = queryParams;


            if (isValid(size)) {
                filterQuery['availableSizes'] = size
            }

            if (isValid(name)) {
                filterQuery['title'] = {}
                filterQuery['title']['$regex'] = name
                filterQuery['title']['$options'] = '$i'
            }

            if (isValid(priceGreaterThan)) {

                if (!(!isNaN(Number(priceGreaterThan)))) {
                    return res.status(400).send({ status: false, message: `priceGreaterThan should be a valid number` })
                }
                if (priceGreaterThan <= 0) {
                    return res.status(400).send({ status: false, message: `priceGreaterThan should be a valid number` })
                }
                if (!Object.prototype.hasOwnProperty.call(filterQuery, 'price'))
                    filterQuery['price'] = {}
                filterQuery['price']['$gte'] = Number(priceGreaterThan)
                console.log(typeof Number(priceGreaterThan))
            }

            if (isValid(priceLessThan)) {

                if (!(!isNaN(Number(priceLessThan)))) {
                    return res.status(400).send({ status: false, message: `priceLessThan should be a valid number` })
                }
                if (priceLessThan <= 0) {
                    return res.status(400).send({ status: false, message: `priceLessThan should be a valid number` })
                }
                if (!Object.prototype.hasOwnProperty.call(filterQuery, 'price'))
                    filterQuery['price'] = {}
                filterQuery['price']['$lte'] = Number(priceLessThan)
                console.log(typeof Number(priceLessThan))
            }

            if (isValid(priceSort)) {

                if (!((priceSort == 1) || (priceSort == -1))) {
                    return res.status(400).send({ status: false, message: `priceSort should be 1 or -1 ` })
                }
    
                    const products = await productModel.find(filterQuery).sort({ price: priceSort })
    
                    if (Array.isArray(products) && products.length === 0) {
                        return res.status(404).send({ statuproductss: false, message: 'No Product found' })
                    }
    
                    return res.status(200).send({ status: true, message: 'Product list', data: products })
            }
        }

        const products = await productModel.find(filterQuery)

        if (Array.isArray(products) && products.length === 0) {
            return res.status(404).send({ statuproductss: false, message: 'No Product found' })
        }

        return res.status(200).send({ status: true, message: 'Success', data: products })
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
}


const getProductDetails = async function (req, res) {
    try {
        const productId = req.params.productId

        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: `${productId} is not a valid product id` })
        }

        const product = await productModel.findOne({ _id: productId, isDeleted: false });

        if (!product) {
            return res.status(404).send({ status: false, message: `product does not exit` })
        }

        return res.status(200).send({ status: true, message: 'Success', data: product })
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}

const updateProduct = async function (req, res) {
    try {
        const requestBody = req.body
        const params = req.params
        const productId = params.productId

        // Validation stats
        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: `${productId} is not a valid product id` })
        }

        const product = await productModel.findOne({ _id: productId, isDeleted: false })

        if (!product) {
            return res.status(404).send({ status: false, message: `product not found` })
        }

        if (!(isValidRequestBody(requestBody) || req.files)) {
            return res.status(400).send({ status: false, message: 'No paramateres passed. product unmodified', data: product })
        }

        // Extract params
        const { title, description, price, currencyId, isFreeShipping, style, availableSizes, installments } = requestBody;

        const updatedProductData = {}
        
        if (isValid(title)) {
            
            const isTitleAlreadyUsed = await productModel.findOne({ title, _id: { $ne: productId } });

            if (isTitleAlreadyUsed) {
                return res.status(400).send({ status: false, message: `${title} title is already used` })
            }

            if (!Object.prototype.hasOwnProperty.call(updatedProductData, '$set'))
                updatedProductData['$set'] = {}

            updatedProductData['$set']['title'] = title
        }

        if (isValid(description)) {
            if (!Object.prototype.hasOwnProperty.call(updatedProductData, '$set'))
                updatedProductData['$set'] = {}
            updatedProductData['$set']['description'] = description
        }

        if (isValid(price)) {

            if (!(!isNaN(Number(price)))) {
                return res.status(400).send({ status: false, message: `Price should be a valid number` })
            }

            if (price<=0) {
                return res.status(400).send({ status: false, message: `Price should be a valid number` })
            }

            if (!Object.prototype.hasOwnProperty.call(updatedProductData, '$set'))
                updatedProductData['$set'] = {}
            updatedProductData['$set']['price'] = price
        }

        if (isValid(currencyId)) {

            if (!(currencyId == "INR")) {
                return res.status(400).send({ status: false, message: 'currencyId should be a INR' })
            }

            if (!Object.prototype.hasOwnProperty.call(updatedProductData, '$set'))
                updatedProductData['$set'] = {}
            updatedProductData['$set']['currencyId'] = currencyId;

            updatedProductData['$set']['currencyFormat'] = currencySymbol(currencyId);
        }

        if (isValid(isFreeShipping)) {

            if(!((isFreeShipping === "true")  || (isFreeShipping === "false"))){
                return res.status(400).send({ status: false, message: 'isFreeShipping should be a boolean value' })
            }

            if (!Object.prototype.hasOwnProperty.call(updatedProductData, '$set'))
                updatedProductData['$set'] = {}
            updatedProductData['$set']['isFreeShipping'] = isFreeShipping;
        }


        let productImage = req.files;
        if ((productImage && productImage.length > 0)) {
               
            //upload to s3 and return true..incase of error in uploading this will goto catch block( as rejected promise)
           let downloadUrl = await uploadFile(productImage[0]); // expect this function to take file as input and give url of uploaded file as output 
            //   res.status(201).send({ status: true, data: uploadedFileURL });
            console.log("urllllll", downloadUrl)

            if (!Object.prototype.hasOwnProperty.call(updatedProductData, '$set'))
                updatedProductData['$set'] = {}
            updatedProductData['$set']['productImage'] = downloadUrl
        }

        if (isValid(style)) {

            if (!Object.prototype.hasOwnProperty.call(updatedProductData, '$set'))
                updatedProductData['$set'] = {}
            updatedProductData['$set']['style'] = style;
        }

        if (availableSizes) {
            let array = availableSizes.split(",").map(x => x.trim())

            for (let i = 0; i < array.length; i++) {
                if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(array[i]))) {
                    return res.status(400).send({ status: false, message: `availableSizes should be among ${["S", "XS", "M", "X", "L", "XXL", "XL"].join(', ')}` })
                }
            }
            if (!Object.prototype.hasOwnProperty.call(updatedProductData, '$addToSet'))
                updatedProductData['$addToSet'] = {}

            console.log(array)
            if (Array.isArray(array)) {
                updatedProductData['$addToSet']['availableSizes'] = { $each: array }
            }
        }

        if (isValid(installments)) {

            if (!(!isNaN(Number(installments)))) {
                return res.status(400).send({ status: false, message: `installments should be a valid number` })
            }

            if (!Object.prototype.hasOwnProperty.call(updatedProductData, '$set'))
                updatedProductData['$set'] = {}
            updatedProductData['$set']['installments'] = installments;
        }

        const updatedProduct = await productModel.findOneAndUpdate({ _id: productId }, updatedProductData, { new: true })

        return res.status(200).send({ status: true, message: 'Success', data: updatedProduct });
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}

const deleteProduct = async function (req, res) {
    try {
        const params = req.params
        const productId = params.productId

        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: `${productId} is not a valid product id` })
        }

        const product = await productModel.findOne({ _id: productId, isDeleted: false })

        if (!product) {
            return res.status(404).send({ status: false, message: `product not found` })
        }

        await productModel.findOneAndUpdate({ _id: productId }, { $set: { isDeleted: true, deletedAt: new Date() } })
        return res.status(200).send({ status: true, message: `Success` })
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}



module.exports.createProduct = createProduct
module.exports.getAllProducts = getAllProducts
module.exports.getProductDetails = getProductDetails
module.exports.updateProduct = updateProduct
module.exports.deleteProduct = deleteProduct