const mongoose = require('mongoose')

const userModel = require('../models/userModel')
const productModel = require('../models/productModel')
const cartModel = require('../models/cartModel')

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

const createCart = async function (req, res) {
    try {
        const userId = req.params.userId
        const requestBody = req.body;

        if (!isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: 'Invalid params received in request body' })
        }

        const { cartId, productId } = requestBody

        if (!isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: `${userId} is not a valid user id` })
        }

        const user = await userModel.findOne({ _id: userId, isDeleted: false });

        if (!user) {
            return res.status(404).send({ status: false, message: `user does not exit` })
        }

        if (!isValid(productId)) {
            return res.status(400).send({ status: false, message: 'productId is required' })
        }

        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: `${productId} is not a valid productId id` })
        }

        const product = await productModel.findOne({ _id: productId, isDeleted: false }).select('_id title price productImage')

        if (!product) {
            return res.status(404).send({ status: false, message: `product does not exit` })
        }

        if (!cartId) {

            const cart = await cartModel.findOne({userId: userId });

            if (cart) {
                return res.status(400).send({ status: false, message: `this user already has a cart` })
            }

            const addToCart = {
                userId: userId,
                items: [
                    {
                        productId: productId,
                        quantity: 1
                    }
                ],
                totalPrice: product.price,
                totalItems: 1
            }

            const cartCreate = await cartModel.create(addToCart)

            cartCreate['items'][0]['productId'] = product

            res.status(201).send({ status: true, message: "success", data: cartCreate })
        }

        if (!isValidObjectId(cartId)) {
            return res.status(400).send({ status: false, message: `${cartId} is not a valid cartId id` })
        }


        const cart = await cartModel.findOne({ userId: userId });

        if (cart) {

            //don't need to fetch cart again. COmpare userId in cart and userId in path param to see ifcRT BELONGS TO THE USER
            const cartNotFound = await cartModel.findOne({ _id: cartId, userId: userId });

            if (!cartNotFound) {
                return res.status(404).send({ status: false, message: `cart does not exit` })
            }


            const isItemAdded = cart.items.find(c => c['productId'] == productId)

            if (isItemAdded) {

                const updatedCartReplaceData = {}

                if (!Object.prototype.hasOwnProperty.call(updatedCartReplaceData, '$pull'))
                    updatedCartReplaceData['$pull'] = {}

                updatedCartReplaceData['$pull']['items'] = { 'productId': productId, 'quantity': isItemAdded.quantity }

                const cartReplace = await cartModel.findOneAndUpdate({ _id: cartId }, updatedCartReplaceData, { new: true })

                const updatedCartData = {}

                if (!Object.prototype.hasOwnProperty.call(updatedCartData, '$addToSet'))
                    updatedCartData['$addToSet'] = {}

                updatedCartData['$addToSet']['items'] = { 'productId': productId, 'quantity': isItemAdded.quantity + 1 }


                if (!Object.prototype.hasOwnProperty.call(updatedCartData, '$set'))
                    updatedCartData['$set'] = {}

                updatedCartData['$set']['totalPrice'] = cart.totalPrice + product.price


                if (!Object.prototype.hasOwnProperty.call(updatedCartData, '$set'))
                    updatedCartData['$set'] = {}

                updatedCartData['$set']['totalItems'] = cart.items.length

                const cartUpToDate = await cartModel.findOneAndUpdate({ _id: cartId }, updatedCartData, { new: true }).populate('items.productId', { _id: 1, title: 1, price: 1, productImage: 1 })

                return res.status(201).send({ status: false, message: "success", data: cartUpToDate })
            }

            const updatedCartData = {}

            if (!Object.prototype.hasOwnProperty.call(updatedCartData, '$addToSet'))
                updatedCartData['$addToSet'] = {}

            updatedCartData['$addToSet']['items'] = { $each: [{ productId: productId, quantity: 1 }] }



            if (!Object.prototype.hasOwnProperty.call(updatedCartData, '$set'))
                updatedCartData['$set'] = {}

            updatedCartData['$set']['totalPrice'] = cart.totalPrice + product.price



            if (!Object.prototype.hasOwnProperty.call(updatedCartData, '$set'))
                updatedCartData['$set'] = {}

            updatedCartData['$set']['totalItems'] = cart.items.length + 1


            const cartUpdate = await cartModel.findOneAndUpdate({ _id: cartId }, updatedCartData, { new: true }).populate('items.productId', { _id: 1, title: 1, price: 1, productImage: 1 })

            return res.status(201).send({ status: false, message: "success", data: cartUpdate })

        }

        const addToCart = {
            userId: userId,
            items: [
                {
                    productId: productId,
                    quantity: 1
                }
            ],
            totalPrice: product.price,
            totalItems: 1
        }

        const cartCreate = await cartModel.create(addToCart)

        cartCreate['items'][0]['productId'] = product

        res.status(201).send({ status: true, message: "success", data: cartCreate })

    } catch (error) {
        console.log(error)
        res.status(500).send({ status: false, data: error.message });
    }
}

const getCart = async function (req, res) {
    try {
        const userId = req.params.userId

        if (!isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: `${userId} is not a valid user id` })
        }

        const user = await userModel.findOne({ _id: userId, isDeleted: false });

        if (!user) {
            return res.status(404).send({ status: false, message: `user does not exit` })
        }

        const cart = await cartModel.findOne({ userId: userId }).populate('items.productId', { _id: 1, title: 1, price: 1, productImage: 1 })

        res.status(200).send({ status: true, message: "success", data: cart })
    } catch (error) {
        console.log(error)
        res.status(500).send({ status: false, data: error });
    }
}

const updateCart = async function (req, res) {
    try {
        const userId = req.params.userId
        requestBody = req.body

        if (!isValidRequestBody(requestBody)) {
          
            const cart = await cartModel.findOne({ userId: userId }).populate('items.productId', { _id: 1, title: 1, price: 1, productImage: 1 })

            return res.status(400).send({ status: true, message: 'no parameteres passed, cart unmodified', data: cart })
        }

        const { cartId, productId, removeProduct } = requestBody


        if (!isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: `${userId} is not a valid user id` })
        }

        const user = await userModel.findOne({ _id: userId, isDeleted: false });

        if (!user) {
            return res.status(404).send({ status: false, message: `user does not exit` })
        }

        if (!isValid(cartId)) {

            return res.status(400).send({ status: true, message: 'cartId is required in the request body'})
        }

        if (!isValidObjectId(cartId)) {
            return res.status(400).send({ status: false, message: `${cartId} is not a valid cartId id` })
        }

        const cartFind = await cartModel.findOne({ _id: cartId, userId: userId }).populate('items.productId', { _id: 1, title: 1, price: 1, productImage: 1 });

        if (!cartFind) {
            return res.status(404).send({ status: false, message: `cart does not exit` })
        }

        if (!isValid(productId)) {

            return res.status(400).send({ status: true, message: 'no parameteres passed of the cart data, cart unmodified', data: cartFind })
        }


        if (!isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: `${productId} is not a valid productId id` })
        }

        const product = await productModel.findOne({ _id: productId, isDeleted: false });

        if (!product) {
            return res.status(404).send({ status: false, message: `product does not exit` })
        }

        if (!isValid(removeProduct)) {

            return res.status(400).send({ status: true, message: 'removeProduct must be in the request body to handling the product', data: cartFind })
        }

        if (!((removeProduct == 0) || (removeProduct == 1))) {
            return res.status(400).send({ status: false, message: `removeProduct should be 0 or 1 ` })
        }


        const cart = await cartModel.findOne({ _id: cartId, userId: userId })
        const isItemAdded = cart.items.find(c => c['productId'] == productId)

        if (removeProduct == 0) {

            if (!isItemAdded) {
                return res.status(404).send({ status: false, message: `product does not exit in the cart` })
            }

            const updatedProductRemoveData = {}

            if (!Object.prototype.hasOwnProperty.call(updatedProductRemoveData, '$pull'))
                updatedProductRemoveData['$pull'] = {}

            updatedProductRemoveData['$pull']['items'] = { 'productId': productId, 'quantity': isItemAdded.quantity }


            if (!Object.prototype.hasOwnProperty.call(updatedProductRemoveData, '$set'))
                updatedProductRemoveData['$set'] = {}

            updatedProductRemoveData['$set']['totalPrice'] = cartFind.totalPrice - (product.price * isItemAdded.quantity)


            if (!Object.prototype.hasOwnProperty.call(updatedProductRemoveData, '$set'))
                updatedProductRemoveData['$set'] = {}

            updatedProductRemoveData['$set']['totalItems'] = cartFind.items.length - 1

            const productRemovefromCart = await cartModel.findOneAndUpdate({ _id: cartId }, updatedProductRemoveData, { new: true }).populate('items.productId', { _id: 1, title: 1, price: 1, productImage: 1 })

            return res.status(200).send({ status: false, message: "success", data: productRemovefromCart })

        }

        if (!isItemAdded) {
            return res.status(404).send({ status: false, message: `product does not exit in the cart` })
        }

        if (isItemAdded.quantity == 1) {

            const updatedCartData = {}

            if (!Object.prototype.hasOwnProperty.call(updatedCartData, '$pull'))
                updatedCartData['$pull'] = {}

            updatedCartData['$pull']['items'] = { 'productId': productId, 'quantity': isItemAdded.quantity }

            if (!Object.prototype.hasOwnProperty.call(updatedCartData, '$set'))
                updatedCartData['$set'] = {}

            updatedCartData['$set']['totalPrice'] = cartFind.totalPrice - product.price


            if (!Object.prototype.hasOwnProperty.call(updatedCartData, '$set'))
                updatedCartData['$set'] = {}

            updatedCartData['$set']['totalItems'] = cartFind.items.length - 1

            const cartUpToDate = await cartModel.findOneAndUpdate({ _id: cartId }, updatedCartData, { new: true }).populate('items.productId', { _id: 1, title: 1, price: 1, productImage: 1 })

            return res.status(200).send({ status: true, message: "success", data: cartUpToDate })

        } else {

            const updatedCartReplaceData = {}

            if (!Object.prototype.hasOwnProperty.call(updatedCartReplaceData, '$pull'))
                updatedCartReplaceData['$pull'] = {}

            updatedCartReplaceData['$pull']['items'] = { 'productId': productId, 'quantity': isItemAdded.quantity }

            const cartReplace = await cartModel.findOneAndUpdate({ _id: cartId }, updatedCartReplaceData, { new: true })

            const updatedCartData = {}

            if (!Object.prototype.hasOwnProperty.call(updatedCartData, '$addToSet'))
                updatedCartData['$addToSet'] = {}

            updatedCartData['$addToSet']['items'] = { 'productId': productId, 'quantity': isItemAdded.quantity - 1 }


            if (!Object.prototype.hasOwnProperty.call(updatedCartData, '$set'))
                updatedCartData['$set'] = {}

            updatedCartData['$set']['totalPrice'] = cartFind.totalPrice - product.price


            if (!Object.prototype.hasOwnProperty.call(updatedCartData, '$set'))
                updatedCartData['$set'] = {}

            updatedCartData['$set']['totalItems'] = cartFind.items.length

            const cartUpToDate = await cartModel.findOneAndUpdate({ _id: cartId }, updatedCartData, { new: true }).populate('items.productId', { _id: 1, title: 1, price: 1, productImage: 1 })

            return res.status(200).send({ status: true, message: "success", data: cartUpToDate })
        }
    } catch (error) {
        console.log(error)
        res.status(500).send({ status: false, data: error });
    }
}


const deleteCart = async function (req, res) {
    try {
        const userId = req.params.userId

        if (!isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: `${userId} is not a valid user id` })
        }

        const user = await userModel.findOne({ _id: userId, isDeleted: false })

        if (!user) {
            return res.status(404).send({ status: false, message: `user not found` })
        }


        const updatedCartData = {}

        if (!Object.prototype.hasOwnProperty.call(updatedCartData, '$set'))
            updatedCartData['$set'] = {}

        updatedCartData['$set']['items'] = []


        if (!Object.prototype.hasOwnProperty.call(updatedCartData, '$set'))
            updatedCartData['$set'] = {}

        updatedCartData['$set']['totalPrice'] = 0



        if (!Object.prototype.hasOwnProperty.call(updatedCartData, '$set'))
            updatedCartData['$set'] = {}

        updatedCartData['$set']['totalItems'] = 0


        const cart = await cartModel.findOneAndUpdate({ userId: userId }, updatedCartData, {new: true})

        res.status(201).send({ status: true, message: "success", data: cart })

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}

module.exports.createCart = createCart
module.exports.getCart = getCart
module.exports.updateCart = updateCart
module.exports.deleteCart = deleteCart