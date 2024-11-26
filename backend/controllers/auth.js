const md5 = require(`md5`)
const jwt = require(`jsonwebtoken`)

const userModel = require(`../models/index`).user
const secret = `davina`

exports.authenticate = async (request, response) => {
    let dataLogin = {
        email: request.body.email,
        password: md5(request.body.password)
    }

    let dataUser = await userModel.findOne({ where: dataLogin })
    
    if(dataUser){
        let payload = JSON.stringify(dataUser)
        console.log(payload)

        let token = jwt.sign(payload, secret)
        return response.json({
            success: true,
            logged: true,
            message: `Authentication Success`,
            token: token,
            data: dataUser
        })
    }
    return response.json({
        success: false,
        logged: false,
        message: `Authentication Failed. Invalid username or password`
    })
}

exports.authorize = (request, response, next) => {
    const authHeader = request.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        let verifiedUser = jwt.verify(token, secret);
        if (!verifiedUser)
        {
            return response.json({
                success: false,
                auth: false,
                message: `User Unauthorized`
            })
        }
        
        request.user = verifiedUser; 
        next();
    } else {
        return response.json({
            success: false,
            auth: false,
            message: `User Unauthorized`
        })
    }
}
