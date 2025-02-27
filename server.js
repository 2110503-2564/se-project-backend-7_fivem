const express =require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

//load env vars
dotenv.config({path:'./config/config.env'});

connectDB();

//Route files
const campgrounds = require('./routes/campgrounds');
const bookings = require('./routes/bookings');
const auth = require('./routes/auth');

const app = express();

//body parser
app.use(express.json());

//cookie parser
app.use(cookieParser());

//Mount routers
app.use('/api/v1/bookings',bookings);
app.use('/api/v1/campgrounds',campgrounds);
app.use('/api/v1/auth',auth);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT,console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));

process.on('unhandledRejection',(err,promise)=>{
    console.log(`Error: ${err.message}`);
    server.close(()=>process.exit(1));
});