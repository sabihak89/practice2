const mongoose = require('mongoose')

const userModel = require('../models/userModel')
const cartModel = require('../models/cartModel')
const orderModel = require('../models/orderModel')
const { json } = require('body-parser')

const isValidRequestBody = function (requestBody) {
    return Object.keys(requestBody).length > 0
}

const isValidObjectId = function (objectId) {
    return mongoose.Types.ObjectId.isValid(objectId)
}

const createOrder = async function (req, res) {
    try {
        const userId = req.params.userId
        const requestBody = req.body;

        if (!isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: 'Invalid params received in request body' })
        }

        const { cartId, cancellable, status } = requestBody

        if (!isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: `${userId} is not a valid user id` })
        }

        const user = await userModel.findOne({ _id: userId, isDeleted: false });

        if (!user) {
            return res.status(404).send({ status: false, message: `user does not exit` })
        }

        if(!cartId){
            return res.status(400).send({ status: false, message: `cartId is required` })
        }

        if (!isValidObjectId(cartId)) {
            return res.status(400).send({ status: false, message: `${cartId} is not a valid cart id` })
        }

        const cart = await cartModel.findOne({ _id: cartId, userId: userId });

        if (!cart) {
            return res.status(404).send({ status: false, message: `this User is not the owner of this cart` })
        }

        if (cancellable) {
            if (!(typeof (cancellable) == 'boolean')) {
                return res.status(404).send({ status: false, message: `Cancellable should be a boolean value` })
            }
        }

        if (status) {
            if ((["pending", "completed", "canceled"].indexOf(status) === -1)) {
                return res.status(400).send({ status: false, message: `Status should be among ${["pending", "completed", "canceled"].join(', ')}` })
            }
        }

        if (!(cart.items.length)) {
            return res.status(202).send({ status: true, message: `order has been accepted, please add more product in the cart` })
        }

        let totalQuantity = 0;
        for (let i = 0; i < cart.items.length; i++) {
            totalQuantity = totalQuantity + cart.items[i].quantity
        }

        const addToOrder = {
            userId: userId,
            items: cart.items,
            totalPrice: cart.totalPrice,
            totalItems: cart.totalItems,
            totalQuantity: totalQuantity,
            cancellable,
            status
        }

        let order = await orderModel.create(addToOrder)

        order= await order.populate('items.productId', { _id: 1, title: 1, price: 1, productImage: 1 })

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


        await cartModel.findOneAndUpdate({ userId: userId }, updatedCartData, {new: true})

        res.status(201).send({ status: true, message: "success", data: order })

    } catch (error) {
        console.log(error)
        res.status(500).send({ status: false, data: error.message });
    }
}

const updateOrder = async function (req, res) {
    try {
        const userId = req.params.userId
        const requestBody = req.body;

        if (!isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: `${userId} is not a valid user id` })
        }

        const user = await userModel.findOne({ _id: userId, isDeleted: false });

        if (!user) {
            return res.status(404).send({ status: false, message: `user does not exit` })
        }

        const { status, orderId } = requestBody;

        if (!orderId) {
            return res.status(400).send({ status: false, message: `orderId is required in request body` })
        }

        if (!isValidObjectId(orderId)) {
            return res.status(400).send({ status: false, message: `${orderId} is not a valid order id` })
        }

        const order = await orderModel.findOne({ _id: orderId }).populate('items.productId', { _id: 1, title: 1, price: 1, productImage: 1 });

        if (!order) {
            return res.status(404).send({ status: false, message: `order does not exit` })
        }

        if(!status){
            return res.status(400).send({status: true, message: "No paramateres passed of the order, order unmodified", data: order})
        }


        if (order.cancellable == true) {

            if (order.status == "pending") {
                if (status) {
                    if ((["completed", "pending", "canceled"].indexOf(status) === -1)) {
                        return res.status(400).send({ status: false, message: `Status should be among ${["completed", "pending", "canceled"].join(', ')}` })
                    }

                    const updatedOrder = await orderModel.findOneAndUpdate({ _id: orderId }, { $set: { status: status } }, { new: true }).populate('items.productId', { _id: 1, title: 1, price: 1, productImage: 1 })

                    return res.status(200).send({ status: true, message: `Success`, data: updatedOrder })
                }
            }

            if (order.status == "completed") {
                if (status) {
                    return res.status(400).send({ status: true, message: `order has been completed hence Status can not be changed` })
                }
            }

            if (order.status == "canceled") {
                if (status) {
                    return res.status(400).send({ status: true, message: `order has been canceled hence Status can not be changed` })
                }
            }

        }

        if (order.status == "completed") {
            if (status) {
                return res.status(400).send({ status: true, message: `order has been completed hence Status can not be changed` })
            }
        }

        if (order.status == "canceled") {
            if (status) {
                return res.status(400).send({ status: true, message: `order has been canceled hence Status can not be changed` })
            }
        }

        if (order.status == "pending") {
            if (status) {
                if((["completed", "pending"].indexOf(status) === -1)) {
                    return res.status(400).send({status: false, message: `this is not cancellable hence status should be among ${["completed", "pending"].join(', ')}`})
                }

                const updatedOrder = await orderModel.findOneAndUpdate({ _id: orderId }, { $set: { status: status } }, { new: true }).populate('items.productId', { _id: 1, title: 1, price: 1, productImage: 1 })

                return res.status(200).send({ status: true, message: `Success`, data: updatedOrder })
            }
        }

    } catch (error) {
        console.log(error)
        res.status(500).send({ status: false, data: error });
    }
}

module.exports.createOrder = createOrder
module.exports.updateOrder = updateOrder