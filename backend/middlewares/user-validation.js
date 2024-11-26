const { validationResult, body } = require('express-validator');

const validateUser = [
    body('nama_user').notEmpty().withMessage('User name is required'),
    body('email').isEmail().withMessage('Invalid email address').normalizeEmail(),
    body('password').isLength({ min: 1 }).withMessage('Password must be at least 3 characters long').notEmpty().withMessage('Password is required'),
    body('role').notEmpty().withMessage('Role is required'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errMessage = errors.array().map(it => it.msg).join(", ");
            return res.status(422).json({ success: false, message: errMessage });
        }
        next();
    }
];

module.exports = { validateUser };
