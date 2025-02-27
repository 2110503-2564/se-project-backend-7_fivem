const Booking = require("../models/Booking");
const Campground = require("../models/Campground");

//@desc     Get all campgrounds
//@route    GET /api/v1/campgrounds
//@access   Public
exports.getCampgrounds = async (req, res, next) => {
    let query;

    //Copy req.query
    const reqQuery = { ...req.query };

    //Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit'];

    //Loop over removeFields and delete them from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);

    //Create query string
    let queryStr = JSON.stringify(req.query);

    //Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
    
    //Finding resource
    query = Campground.find(JSON.parse(queryStr)).populate(`bookings`);

    //Select Fields
    if(req.query.select){
        const fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
    }
    //Sort
    if(req.query.sort){
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    }else{
        query = query.sort('-createdAt');
    }

    //Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    try{
        const total = await Campground.countDocuments();
        query = query.skip(startIndex).limit(limit);
        //Executing query
        const campgrounds = await query;
        //Pagination result
        const pagination = {};

        if(endIndex < total){
            pagination.next = {
                page: page + 1,
                limit
            };
        }

        if(startIndex > 0){
            pagination.prev = {
                page: page - 1,
                limit
            };
        }

        res.status(200).json({ success: true, count: campgrounds.length,pagination, data: campgrounds });
    }catch(err){
        res.status(400).json({ success: false });
    }
};

//@desc     Get single campground
//@route    GET /api/v1/campgrounds/:id
//@access   Public
exports.getCampground = async (req, res, next) => {
    try{
        const campground = await Campground.findById(req.params.id).populate({
            path:'bookings',
            select:'apptDate user'
        });
        if(!campground){
            return res.status(400).json({ success: false });
        }
        res.status(200).json({ success: true, data: campground });
    }catch(err){
        res.status(400).json({ success: false });
    }
};

//@desc     Create new campground
//@route    POST /api/v1/campgrounds
//@access   Private
exports.createCampground = async (req, res, next) => {
    const campground = await Campground.create(req.body);
    res.status(201).json({
        success: true,
        data: campground
    });
};

//@desc     Update campground
//@route    PUT /api/v1/campgrounds/:id
//@access   Private
exports.updateCampground = async (req, res, next) => {
   try{
        const campground = await Campground.findByIdAndUpdate(req.params.id
            , req.body, {
                new: true,
                runValidators: true
            });
        if(!campground){  
            return res.status(400).json({ success: false });
        }
        res.status(200).json({ success: true, data: campground });
    }catch(err){    
        res.status(400).json({ success: false });
    }
};

//@desc     Delete campground
//@route    DELETE /api/v1/campgrounds/:id
//@access   Private
exports.deleteCampground = async (req, res, next) => {
    try{
        const campground = await Campground.findById(req.params.id);
        if(!campground){
            return res.status(404).json({ success: false,message:`Campground not found with id of ${req.params.id}` });
        }
        await Booking.deleteMany({ campground: req.params.id });
        await Campground.deleteOne({ _id: req.params.id });

        res.status(200).json({ success: true, data: {} });
        }
    catch(err){
        res.status(400).json({ success: false });
    }
};
