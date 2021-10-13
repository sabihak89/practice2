const jwt = require('jsonwebtoken')

const jwtSecretKey = 'someverysensitiveandsecretkey3090@#'

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')
        if(!token) {
            return res.status(403).send({status: false, message: `Missing authentication token in request`})
        }

        const splitToken = token.split(' ')

        if(splitToken.length !== 2 || splitToken[0] !== 'Bearer' || !splitToken[1]) {
            return res.status(403).send({status: false, message: `Invalid token format`})
        }

        const decoded = await jwt.verify(splitToken[1], jwtSecretKey)

        if(!decoded) {
            return res.status(403).send({status: false, message: `Invalid authentication token in request`})
        }

        if(decoded.userId !== req.params.userId) {
            return res.status(403).send({status: false, message: `Unauthorized accesss.`})
        }

        req.userId = decoded.userId

        next()
    } catch (error) {
        return res.status(500).send({status: false, message: error.message})
    }
}

module.exports = authMiddleware