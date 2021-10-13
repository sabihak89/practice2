const mongoose = require('mongoose')

const validEmailFormatRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
const validIndianMobileRegex = /^[0]?[789]\d{9}$/

const userSchema = new mongoose.Schema({
    fname: {type: String, required: true, trim: true},
    lname: {type: String, required: true, trim: true},
    email: {type: String, required: true, trim: true, lowercase: true, unique: true, validate: {
        validator: function(v) {
            return validEmailFormatRegex.test(v)
        },
        message: function(props) {
            return String(props.value) + 'is not a valid email address'
        },
        isAsync: false
    }},
    profileImage: {type: String}, // s3 link
    phone: {type: Number, required: true, unique: true, validate: {
        validator: function(v) {
            return validIndianMobileRegex.test(v)
        },
        message: function(props) {
            return String(props.value) + 'is not a valid indian mobile number'
        },
        isAsync: false
    }},
    password: {type: String, required: true, min: 8, max: 15}, // encrypted password
    address: {
        shipping: {
            street: {type: String, required: true},
            city: {type: String, required: true},
            pincode: {type: Number, required: true}
        },
        billing: {
            street: {type: String, required: true},
            city: {type: String, required: true},
            pincode: {type: Number, required: true}
        }
    },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema)