const express = require(`express`)
const bodyParser = require('body-parser')
const app = express()
const PORT = 8000
const cors = require(`cors`)
app.use(cors())

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(
    "/",
    express.static(__dirname)
);

const userRoute = require('./routes/user')
app.use('/user', userRoute)

const tipe_kamarRoute = require("./routes/tipe_kamar")
app.use('/tipekamar', tipe_kamarRoute)

const kamarRoute = require('./routes/kamar')
app.use('/kamar', kamarRoute)

const pemesananRoute = require('./routes/pemesanan')
app.use('/pemesanan', pemesananRoute)

app.listen(PORT, () => {
    console.log(`Server of Hotel Davina runs on port ${PORT}`)   
})